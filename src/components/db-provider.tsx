import React, { createContext, useContext, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface DbContextType {
  isOpen: boolean;
  filePath: string | null;
  recentPaths: string[];
  openDb: () => Promise<string | null>;
  createDb: () => Promise<string | null>;
  openDbByPath: (path: string) => Promise<boolean>;
  closeDb: () => Promise<void>;
  query: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
  execute: (sql: string, params?: any[]) => Promise<{ rows_affected: number; last_insert_id: number }>;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
}

const DbContext = createContext<DbContextType | undefined>(undefined);

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load recent files from localStorage
    const saved = localStorage.getItem("stkdb_recent_files");
    if (saved) {
      try {
        setRecentPaths(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }

    // Check if there is an active DB on Rust side (in case of page reloads, though less common in Tauri)
    invoke<string | null>("get_current_db_path")
      .then((path) => {
        if (path) {
          setFilePath(path);
          setIsOpen(true);
          addToRecent(path);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching current DB path:", err);
        setLoading(false);
      });
  }, []);

  const addToRecent = (path: string) => {
    setRecentPaths((prev) => {
      const filtered = prev.filter((p) => p !== path);
      const updated = [path, ...filtered].slice(0, 5); // Keep last 5
      localStorage.setItem("stkdb_recent_files", JSON.stringify(updated));
      return updated;
    });
  };

  const openDb = async () => {
    setError(null);
    try {
      const path = await invoke<string | null>("select_and_open_db");
      if (path) {
        setFilePath(path);
        setIsOpen(true);
        addToRecent(path);
        return path;
      }
      return null;
    } catch (err: any) {
      setError(err.toString());
      throw err;
    }
  };

  const createDb = async () => {
    setError(null);
    try {
      const path = await invoke<string | null>("create_new_db");
      if (path) {
        setFilePath(path);
        setIsOpen(true);
        addToRecent(path);
        return path;
      }
      return null;
    } catch (err: any) {
      setError(err.toString());
      throw err;
    }
  };

  const openDbByPath = async (path: string) => {
    setError(null);
    try {
      const success = await invoke<boolean>("open_db_by_path", { path });
      if (success) {
        setFilePath(path);
        setIsOpen(true);
        addToRecent(path);
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.toString());
      // If path fails to open, remove from recent files
      setRecentPaths((prev) => {
        const updated = prev.filter((p) => p !== path);
        localStorage.setItem("stkdb_recent_files", JSON.stringify(updated));
        return updated;
      });
      throw err;
    }
  };

  const closeDb = async () => {
    setError(null);
    try {
      await invoke("close_current_db");
      setFilePath(null);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.toString());
      throw err;
    }
  };

  const query = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
    try {
      return await invoke<T[]>("query_sql", { sql, params });
    } catch (err: any) {
      setError(err.toString());
      throw err;
    }
  };

  const execute = async (sql: string, params: any[] = []) => {
    try {
      return await invoke<{ rows_affected: number; last_insert_id: number }>("execute_sql", { sql, params });
    } catch (err: any) {
      setError(err.toString());
      throw err;
    }
  };

  return (
    <DbContext.Provider
      value={{
        isOpen,
        filePath,
        recentPaths,
        openDb,
        createDb,
        openDbByPath,
        closeDb,
        query,
        execute,
        loading,
        error,
        setError,
      }}
    >
      {children}
    </DbContext.Provider>
  );
};

export const useDb = () => {
  const context = useContext(DbContext);
  if (!context) {
    throw new Error("useDb must be used within a DbProvider");
  }
  return context;
};
