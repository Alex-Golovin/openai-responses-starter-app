"use client";
import { useEffect } from "react";
import { defaultVectorStore } from "@/config/constants";
import useToolsStore from "@/stores/useToolsStore";

export default function ToolsPanel() {
  const vectorStore = useToolsStore((state) => state.vectorStore);
  const setFileSearchEnabled = useToolsStore((state) => state.setFileSearchEnabled);
  const setFunctionsEnabled = useToolsStore((state) => state.setFunctionsEnabled);
  const setVectorStore = useToolsStore((state) => state.setVectorStore);

  useEffect(() => {
    setFileSearchEnabled(true);
    setFunctionsEnabled(false);
    if (defaultVectorStore.id) {
      setVectorStore(defaultVectorStore);
    }
  }, [setFileSearchEnabled, setFunctionsEnabled, setVectorStore]);

  return (
    <aside className="flex h-full w-full flex-col gap-6 overflow-y-auto bg-white p-6 text-sm text-stone-700">
      <div>
        <h2 className="text-base font-semibold text-stone-900">Пісочниця</h2>
        <p className="mt-2">
          Цей інтерфейс використовує чат як внутрішній стенд для тестування адмін-даних та
          відповідей агента.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-stone-900">File Search</h3>
        <p className="mt-1">
          Пошук по векторному сховищу активовано за замовчуванням і вимкнути його в UI неможливо.
        </p>
        {vectorStore?.id ? (
          <p className="mt-2 font-mono text-xs text-stone-500">
            vector_store_id: {vectorStore.id}
          </p>
        ) : (
          <p className="mt-2 text-xs text-amber-600">
            Vector Store ще не налаштований. Додайте ідентифікатор у конфіг, щоб увімкнути RAG.
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-stone-900">Локальні інструменти</h3>
        <p className="mt-1">
          Інтеграції parse_files, run_checks тощо вмикаються в коді. У цьому UI перемикачі не
          передбачені.
        </p>
      </div>
    </aside>
  );
}
