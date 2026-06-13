import { useCallback, useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";

export function usePagedItems<T>(items: T[], page: number, setPage: Dispatch<SetStateAction<number>>, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount, setPage]);

  const pagedItems = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);
  const previousPage = useCallback(() => setPage((current) => Math.max(1, current - 1)), [setPage]);
  const nextPage = useCallback(() => setPage((current) => Math.min(pageCount, current + 1)), [pageCount, setPage]);

  return { pageCount, pagedItems, previousPage, nextPage };
}
