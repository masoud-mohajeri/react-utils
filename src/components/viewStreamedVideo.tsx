import React from "react";
import type { FC } from "react";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

type ViewStreamedVideoProps = {
  videoSource: string;
  className?: string;
  isLoop?: boolean;
  isAutoPlay?: boolean;
  isMuted?: boolean;
  posterLink?: string;
  shouldPlay?: boolean;
  onReadyToPlay?: VoidFunction;
  onError?: (error?: { message: ViewStreamedVideoErrorsType; cause?: any }) => void;
};

export type ViewStreamedVideoErrorsType =
  | "VideoStreamIsNotUnsupported"
  | "ErrorInPlayingVideoWithHlsjs"
  | "ErrorInPlayingVideoInVideoTag";

type MimeTypeResultType = {
  error?: { message: string; error: any };
  mimeType?: string;
};

/**
 *  Caution: there is a restriction on auto playing a not muted video.
 *  if you want to do so, do it on user interaction(use onReadyToPlay)
 */
const ViewStreamedVideo: FC<ViewStreamedVideoProps> = ({
  videoSource,
  className,
  isLoop = true,
  isMuted = true,
  isAutoPlay = true,
  posterLink,
  onReadyToPlay,
  shouldPlay,
  onError,
}) => {
  const [isVideoReadyToPlay, setIsVideoReadyToPlay] = useState(false);
  const [isStreamerReady, setIsStreamerReady] = useState(false);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const [mimeTypeResult, setMimeTypeResult] = useState<MimeTypeResultType | null>(null);

  const getFileMimeTypeFromLink = async () => {
    try {
      // HEAD method doesn't have body so it is fast. it just gets "Content-Type" and "Content-Length" headers
      const response = await fetch(videoSource, {
        method: "HEAD",
      });
      setMimeTypeResult({ mimeType: response.headers.get("Content-Type")! });
    } catch (error) {
      setMimeTypeResult({ error: { message: "Error in getting mime type", error } });
    }
  };

  const preparePlayOfStreamedVideo = () => {
    // supported mime types in safari: application/vnd.apple.mpegURL - application/x-mpegURL - video/MP2T
    // source: https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/StreamingMediaGuide/DeployingHTTPLiveStreaming/DeployingHTTPLiveStreaming.html
    const videoElement = videoElementRef.current;
    if (!videoElement) {
      onError && onError();
      return;
    }
    videoElement.src = videoSource;

    if (!mimeTypeResult?.error && mimeTypeResult?.mimeType && videoElement.canPlayType(mimeTypeResult.mimeType)) {
      // hls.js is not supported on platforms that do not have Media Source Extensions (MSE) enabled.
      // When the browser has built-in http live streaming(HLS) support we can provide an HLS manifest (i.e. .m3u8 URL) directly to the video element through the `src` property.
      // for more information go to https://stackoverflow.com/a/61008253/14835772
      videoElement.addEventListener("loadedmetadata", () => {
        setIsStreamerReady(true);
        setIsVideoReadyToPlay(true);
      });
      return null;
    }

    // hls.js isn't supported well in [old] safari versions: https://github.com/video-dev/hls.js?tab=readme-ov-file#compatibility
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoSource);
      hls.attachMedia(videoElement);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsStreamerReady(true);
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        onError && onError({ message: "ErrorInPlayingVideoWithHlsjs", cause: data });
      });

      return () => {
        hls.destroy();
      };
    }

    onError && onError({ message: "VideoStreamIsNotUnsupported" });
    return null;
  };

  useEffect(() => {
    let destroy: any;

    if (!mimeTypeResult) {
      getFileMimeTypeFromLink();
    } else {
      destroy = preparePlayOfStreamedVideo();
    }

    return () => {
      destroy?.();
    };
  }, [mimeTypeResult]);

  useEffect(() => {
    if (isStreamerReady && isVideoReadyToPlay && shouldPlay) {
      videoElementRef?.current?.play();
    }
  }, [isStreamerReady, isVideoReadyToPlay, shouldPlay]);

  useEffect(() => {
    if (isStreamerReady && isVideoReadyToPlay) {
      onReadyToPlay && onReadyToPlay();
    }
  }, [isStreamerReady, isVideoReadyToPlay]);

  return (
    <div className={className}>
      {!posterLink && (!isVideoReadyToPlay || !isStreamerReady) && <div>Loading...</div>}
      <video
        poster={posterLink}
        ref={videoElementRef}
        controls={false}
        className="object-cover object-center w-full h-full"
        onLoadedData={() => setIsVideoReadyToPlay(true)}
        src={videoSource}
        autoPlay={isAutoPlay}
        loop={isLoop}
        muted={isMuted}
        playsInline
        onError={(error) => onError && onError({ message: "ErrorInPlayingVideoInVideoTag", cause: error })}
      />
    </div>
  );
};

export default ViewStreamedVideo;
