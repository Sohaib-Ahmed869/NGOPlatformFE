import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "../../../components/Portal";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Search,
  Plus,
  Package,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Eye,
  EyeOff,
  Boxes,
  Tag,
  Loader2,
  ImageOff,
} from "lucide-react";
import {
  getAdminProducts,
  getCachedAdminProducts,
  deleteProduct,
  getCategories,
  updateProduct,
} from "../../../services/productService";
import { TabLoader } from "../../../components/TabLoader";
import { withMinDelay } from "../../../utils/minDelay";
import { cn } from "../../../utils/cn";
import { CustomSelect } from "../../../components/CustomSelect";

const ITEMS_PER_PAGE = 15;
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const money = (n) => `$${Number(n || 0).toFixed(2)}`;

// Entrance/exit motion — a coordinated stagger so cards/rows appear smoothly,
// plus a clean cross-fade when switching between grid and list (the content is
// keyed by view+page, so it replays on open, view-switch and pagination).
const fadeWrap = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.28 } },
};
const gridContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.28 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.1 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

// Image with a graceful empty state for missing OR broken-URL images.
function ProductImage({ src, alt, compact = false }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="grid h-full w-full place-items-center bg-gray-50 text-gray-300">
      {compact ? (
        <ImageOff className="h-4 w-4" />
      ) : (
        <div className="flex flex-col items-center gap-1">
          <ImageOff className="h-7 w-7" />
          <span className="text-[10px] font-medium uppercase tracking-wide">No image</span>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone = "accent" }) {
  const tones = {
    accent: "bg-accent/10 text-accent",
    muted: "bg-gray-100 text-gray-500",
  };
  return (
    <div className="flex items-center gap-3 border border-gray-100 bg-white p-3.5 shadow-sm">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center", tones[tone])}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div>
        <p className="text-lg font-bold leading-none text-primary">{value}</p>
        <p className="mt-1 text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}

const ProductList = () => {
  const cached = getCachedAdminProducts();
  const [products, setProducts] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | hidden
  const [categories, setCategories] = useState([]);
  const [view, setView] = useState("grid"); // grid | list
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    // Only hit the API when we don't already have the list cached.
    if (!getCachedAdminProducts()) loadProducts();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await withMinDelay(getAdminProducts());
      setProducts(data.products || []);
    } catch {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data.categories || []);
    } catch {
      /* optional */
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget._id);
      setProducts((prev) => prev.filter((p) => p._id !== deleteTarget._id));
      toast.success("Product deleted");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (p) => {
    setTogglingId(p._id);
    try {
      await updateProduct(p._id, {
        title: p.title,
        description: p.description,
        price: p.price,
        category: p.category,
        isActive: !p.isActive,
      });
      setProducts((prev) => prev.map((x) => (x._id === p._id ? { ...x, isActive: !x.isActive } : x)));
      toast.success(!p.isActive ? "Product is now visible" : "Product hidden");
    } catch {
      toast.error("Failed to update");
    } finally {
      setTogglingId(null);
    }
  };

  const stats = useMemo(() => {
    const active = products.filter((p) => p.isActive).length;
    const cats = new Set(products.map((p) => p.category).filter(Boolean)).size;
    return { total: products.length, active, hidden: products.length - active, cats };
  }, [products]);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !q || p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
        const matchesCat = !categoryFilter || p.category === categoryFilter;
        const matchesStatus =
          statusFilter === "all" || (statusFilter === "active" ? p.isActive : !p.isActive);
        return matchesSearch && matchesCat && matchesStatus;
      }),
    [products, searchTerm, categoryFilter, statusFilter],
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading products…" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Products</h1>
          <p className="mt-1 text-sm text-text-muted">Manage the items in your shop.</p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
        >
          <Plus className="h-4 w-4" /> Add product
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Boxes} label="Total products" value={stats.total} tone="accent" />
        <StatCard icon={Eye} label="Active" value={stats.active} tone="accent" />
        <StatCard icon={EyeOff} label="Hidden" value={stats.hidden} tone="muted" />
        <StatCard icon={Tag} label="Categories" value={stats.cats} tone="accent" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products…"
            className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white"
          />
        </div>
        <CustomSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={[
            { value: "", label: "All categories" },
            ...categories.map((c) => ({ value: c, label: cap(c) })),
          ]}
          triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          className="sm:min-w-[150px]"
        />
        <CustomSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All status" },
            { value: "active", label: "Active" },
            { value: "hidden", label: "Hidden" },
          ]}
          triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="inline-flex shrink-0 border border-gray-200">
          <button
            type="button"
            onClick={() => setView("grid")}
            title="Grid view"
            className={cn(
              "grid h-9 w-9 place-items-center transition-colors",
              view === "grid" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            title="List view"
            className={cn(
              "grid h-9 w-9 place-items-center transition-colors",
              view === "list" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50",
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {paginated.length === 0 ? (
          <motion.div
            key="empty"
            variants={fadeWrap}
            initial="hidden"
            animate="show"
            exit="exit"
            className="border border-gray-100 bg-white p-12 text-center shadow-sm"
          >
          <Package className="mx-auto mb-3 h-10 w-10 text-text-muted" />
          <p className="text-text-muted">
            {products.length === 0
              ? 'No products yet. Click "Add product" to get started.'
              : "No products match your filters."}
          </p>
          </motion.div>
        ) : view === "grid" ? (
          <motion.div
            key={`grid-${currentPage}`}
            variants={gridContainer}
            initial="hidden"
            animate="show"
            exit="exit"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          >
          {paginated.map((p) => (
            <motion.div
              key={p._id}
              variants={cardVariants}
              className="group flex flex-col overflow-hidden border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative h-40 shrink-0 overflow-hidden bg-gray-50">
                <ProductImage src={p.image} alt={p.title} />
                <span
                  className={cn(
                    "absolute left-1.5 top-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white",
                    p.isActive ? "bg-accent" : "bg-gray-900/70",
                  )}
                >
                  {p.isActive ? "Active" : "Hidden"}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-2.5">
                <span className="block h-3.5 text-[10px] font-semibold uppercase leading-none tracking-wider text-accent">
                  {cap(p.category) || "—"}
                </span>
                <h3 className="mt-1 line-clamp-1 text-[13px] font-semibold leading-tight text-primary">
                  {p.title}
                </h3>
                <p className="mt-1 line-clamp-2 min-h-[30px] text-[11px] leading-snug text-text-muted">
                  {p.description || "No description"}
                </p>
                <div className="mt-auto flex items-center justify-between pt-2.5">
                  <span className="text-sm font-bold text-primary">{money(p.price)}</span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => toggleActive(p)}
                      disabled={togglingId === p._id}
                      title={p.isActive ? "Hide from shop" : "Show in shop"}
                      className="grid h-7 w-7 place-items-center text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-50"
                    >
                      {togglingId === p._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : p.isActive ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <Link
                      to={`/admin/products/edit/${p._id}`}
                      state={{ product: p }}
                      title="Edit"
                      className="grid h-7 w-7 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(p)}
                      title="Delete"
                      className="grid h-7 w-7 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          </motion.div>
        ) : (
          <motion.div
            key={`list-${currentPage}`}
            variants={fadeWrap}
            initial="hidden"
            animate="show"
            exit="exit"
            className="overflow-hidden border border-gray-100 bg-white shadow-sm"
          >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={listContainer}>
                {paginated.map((p) => (
                  <motion.tr key={p._id} variants={rowVariants} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden bg-gray-100">
                          <ProductImage src={p.image} alt="" compact />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-primary">{p.title}</p>
                          <p className="max-w-[320px] truncate text-xs text-text-muted">{p.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">{cap(p.category) || "—"}</td>
                    <td className="px-4 py-2.5 font-semibold text-primary">{money(p.price)}</td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleActive(p)}
                        disabled={togglingId === p._id}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold transition-colors",
                          p.isActive ? "bg-accent/10 text-accent" : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {togglingId === p._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : p.isActive ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                        {p.isActive ? "Active" : "Hidden"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/products/edit/${p._id}`}
                          state={{ product: p }}
                          className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <span className="text-xs text-text-muted">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "h-8 w-8 text-xs font-medium transition-colors",
                  currentPage === page ? "bg-accent text-white" : "text-text-muted hover:bg-gray-100",
                )}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <Portal>
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !deleting && setDeleteTarget(null)}
            />
            <motion.div
              className="relative w-full max-w-sm border border-gray-100 bg-white p-6 text-center shadow-2xl"
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
            >
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-50">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-primary">Delete “{deleteTarget.title}”?</h3>
              <p className="mt-1 text-sm text-text-muted">
                This permanently removes the product. This can't be undone.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex flex-1 items-center justify-center gap-2 bg-red-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>
    </div>
  );
};

export default ProductList;
