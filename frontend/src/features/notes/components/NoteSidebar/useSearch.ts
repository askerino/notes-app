import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";

export function useSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const [inputElement, setInputElement] = useState<HTMLInputElement | null>(null);
  const [inputValue, setInputValue] = useState(query);
  const isComposingRef = useRef(false);

  function updateQuery(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set("q", value);
    } else {
      next.delete("q");
    }
    setSearchParams(next, { replace: true });
  }

  function onInputChange(value: string) {
    setInputValue(value);

    if (!isComposingRef.current) {
      updateQuery(value);
    }
  }

  function onCompositionStart() {
    isComposingRef.current = true;
  }

  function onCompositionEnd(value: string) {
    isComposingRef.current = false;
    setInputValue(value);
    updateQuery(value);
  }

  function clear() {
    setInputValue("");
    updateQuery("");
    inputElement?.focus();
  }

  function focus() {
    inputElement?.focus();
  }

  useEffect(() => {
    if (!isComposingRef.current) {
      setInputValue(query);
    }
  }, [query]);

  return {
    inputRef: setInputElement,

    query,
    inputValue,
    onInputChange,
    onCompositionStart,
    onCompositionEnd,
    clear,
    focus,
  };
}
