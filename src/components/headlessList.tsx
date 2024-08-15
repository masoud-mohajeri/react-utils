import type { CSSProperties, ReactElement } from "react";
import { forwardRef, useEffect } from "react";

import { useIntersection } from "../hooks";
import { classNameCreator } from "../functions";

// Redeclare forwardRef to support Generic types in forwardRef
declare module "react" {
  function forwardRef<T, P = {}>(
    render: (props: P, ref: Ref<T>) => ReactElement | null,
  ): (props: P & RefAttributes<T>) => ReactElement | null;
}
type DataListBaseProps<DataType> = {
  children: (data: DataType, index: number) => ReactElement;
  data: DataType[];
  emptyStateElement?: ReactElement;
  className?: string;
  customShimmer?: ReactElement[];
  isLoading?: boolean;
  hasError?: boolean;
  style?: CSSProperties;
};

type DataListCoreProps<DataType> =
  | ({
      title: string | ReactElement;
      isReverse?: never;
    } & DataListBaseProps<DataType>)
  | ({
      isReverse?: true;
      title?: never;
    } & DataListBaseProps<DataType>);

type BaseDataListProps<DataType> = {
  loadNextPage?: never;
  hasNextPage?: never;
  isFetchingNextPage?: never;
} & DataListCoreProps<DataType>;

type PaginatedData<DataType> = {
  loadNextPage: VoidFunction;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
} & DataListCoreProps<DataType>;

type DataListProps<DataType> = PaginatedData<DataType> | BaseDataListProps<DataType>;

const DataListInner = <T,>(
  {
    data,
    emptyStateElement,
    title,
    className,
    hasError,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    loadNextPage,
    customShimmer,
    children,
    isReverse,
    style,
  }: DataListProps<T>,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) => {
  /**
   * The 20% is the offset of the view port that triggers new request
   */
  const [intersectionTargetRef, entry] = useIntersection({ threshold: 0.1, rootMargin: "0px 0px 20% 0px" });

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isLoading && !isFetchingNextPage && !hasError) {
      loadNextPage?.();
    }
  }, [entry, hasNextPage, isLoading, loadNextPage, isFetchingNextPage]);

  const isInitialShimmerShown = !data?.length && isLoading;
  const isEmptyStateShown = !data?.length && !isLoading;
  const isListDataShown = !!data?.length;
  const isFetchMoreLoadingShown = isFetchingNextPage && hasNextPage && !hasError;

  return (
    <div
      className={classNameCreator(
        "flex overflow-auto",
        isReverse ? "flex-col-reverse justify-items-end" : "flex-col",
        className,
      )}
      ref={forwardedRef}
      style={style}>
      {title && <h4 className="pb-4">{title}</h4>}

      {isInitialShimmerShown && customShimmer}

      {isEmptyStateShown && <div className="h-full flex items-center">{emptyStateElement}</div>}

      {isListDataShown && data.map(children)}

      <div className="flex justify-center text-surface-brand" ref={(el) => intersectionTargetRef(el as HTMLDivElement)}>
        {isFetchMoreLoadingShown && <div className="my-4">Loading...</div>}
      </div>
    </div>
  );
};

export default forwardRef(DataListInner);
