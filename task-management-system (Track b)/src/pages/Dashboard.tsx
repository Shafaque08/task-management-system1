import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { CheckCircle2, Circle, Edit2, Trash2, Plus, Search, LogOut, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("TODO");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/tasks", {
        params: { page, limit: 10, status: statusFilter, search },
      });
      setTasks(res.data.tasks);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      toast.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await axios.patch(`/api/tasks/${editingTask.id}`, { title, description, status });
        toast.success("Task updated");
      } else {
        await axios.post("/api/tasks", { title, description, status });
        toast.success("Task created");
      }
      setIsModalOpen(false);
      fetchTasks();
    } catch (err) {
      toast.error("Failed to save task");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`/api/tasks/${id}`);
      toast.success("Task deleted");
      fetchTasks();
    } catch (err) {
      toast.error("Failed to delete task");
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await axios.patch(`/api/tasks/${id}/toggle`);
      fetchTasks();
    } catch (err) {
      toast.error("Failed to toggle task");
    }
  };

  const openModal = (task?: any) => {
    if (task) {
      setEditingTask(task);
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
    } else {
      setEditingTask(null);
      setTitle("");
      setDescription("");
      setStatus("TODO");
    }
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white shadow-sm border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-zinc-900">Task Manager</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-600">Welcome, {user?.name || user?.email}</span>
              <button
                onClick={logout}
                className="p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex-1 w-full sm:w-auto flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-zinc-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="">All Status</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={20} />
            Add Task
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
            <ul className="divide-y divide-zinc-200">
              <AnimatePresence>
                {tasks.length === 0 ? (
                  <li className="p-8 text-center text-zinc-500">No tasks found.</li>
                ) : (
                  tasks.map((task) => (
                    <motion.li
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 sm:p-6 hover:bg-zinc-50 transition-colors group"
                    >
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => handleToggle(task.id)}
                          className={`mt-1 flex-shrink-0 transition-colors ${
                            task.status === "DONE" ? "text-emerald-500" : "text-zinc-400 hover:text-indigo-500"
                          }`}
                        >
                          {task.status === "DONE" ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`text-lg font-medium truncate ${
                              task.status === "DONE" ? "text-zinc-400 line-through" : "text-zinc-900"
                            }`}
                          >
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="mt-1 text-zinc-500 text-sm line-clamp-2">{task.description}</p>
                          )}
                          <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                            <span
                              className={`px-2 py-1 rounded-full font-medium ${
                                task.status === "DONE"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : task.status === "IN_PROGRESS"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-zinc-100 text-zinc-700"
                              }`}
                            >
                              {task.status.replace("_", " ")}
                            </span>
                            <span>Created {format(new Date(task.createdAt), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openModal(task)}
                            className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </motion.li>
                  ))
                )}
              </AnimatePresence>
            </ul>
            
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-between bg-zinc-50">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-zinc-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-zinc-900">
                  {editingTask ? "Edit Task" : "New Task"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleSaveTask} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Task title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
                <div className="pt-4 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 rounded-lg hover:bg-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    Save Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
