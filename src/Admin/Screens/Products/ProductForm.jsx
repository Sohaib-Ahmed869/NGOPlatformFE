import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "../../../components/Portal";
import { toast } from "react-hot-toast";
import { ArrowLeft, UploadCloud, X, Loader2, Check, Package, Trash2 } from "lucide-react";
import {
  getProductById,
  getCachedAdminProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
} from "../../../services/productService";
import { TabLoader } from "../../../components/TabLoader";
import { CustomSelect } from "../../../components/CustomSelect";
import { cn } from "../../../utils/cn";

const DEFAULT_CATEGORIES = ["education", "food", "emergencies", "water"];
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Match the profile/settings underline "line" field aesthetic.
const labelCls = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500";
const lineInput =
  "w-full border-b border-gray-200 bg-transparent py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent";

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = Boolean(id);
  const fileRef = useRef(null);

  // Seed from data handed over by the list (router state) or the session cache
  // so a normal "Edit" click renders instantly with NO network call.
  const preset = isEdit ? location.state?.product || getCachedAdminProduct(id) : null;
  const toForm = (p) => ({
    title: p?.title || "",
    description: p?.description || "",
    price: p?.price ?? "",
    category: p?.category || "education",
    isActive: p ? p.isActive !== false : true,
  });

  const [form, setForm] = useState(() => toForm(preset));
  const [imagePreview, setImagePreview] = useState(preset?.image || "");
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(isEdit && !preset);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(false);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getCategories()
      .then((d) => {
        if (d.categories?.length) setCategories(d.categories);
      })
      .catch(() => {});
    // Only deep-links / hard refreshes (no preset) need to fetch from the API.
    if (isEdit && !preset) fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await getProductById(id);
      setForm(toForm(res.product));
      if (res.product.image) setImagePreview(res.product.image);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load product");
      navigate("/admin/products");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProduct(id);
      toast.success("Product deleted");
      navigate("/admin/products");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete product");
      setDeleting(false);
    }
  };

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const pickImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.price || !form.category)
      return toast.error("Please fill all required fields");
    if (!isEdit && !imageFile) return toast.error("Please upload a product image");

    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        image: imageFile || (isEdit ? undefined : null),
      };
      if (isEdit) {
        await updateProduct(id, payload);
        toast.success("Product updated");
      } else {
        await createProduct(payload);
        toast.success("Product created");
      }
      navigate("/admin/products");
    } catch (e) {
      toast.error(e.response?.data?.message || `Failed to ${isEdit ? "update" : "create"} product`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading product…" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/products"
          className="grid h-9 w-9 shrink-0 place-items-center border border-gray-200 text-text-muted transition-colors hover:bg-gray-50 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-primary">{isEdit ? "Edit product" : "Add product"}</h1>
          <p className="text-sm text-text-muted">
            {isEdit ? "Update the details of this product." : "Add a new item to your shop."}
          </p>
        </div>
        {isEdit && (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="ml-auto inline-flex items-center gap-2 border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Left: fields */}
          <div className="space-y-7 border border-gray-100 bg-white p-6 shadow-sm">
            <div>
              <label className={labelCls}>Title</label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className={lineInput}
                placeholder="e.g., Education Pack"
                required
              />
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className={cn(lineInput, "resize-none")}
                placeholder="Describe the product…"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Price (USD)</label>
                <div className="flex items-center border-b border-gray-200 transition-colors focus-within:border-accent">
                  <span className="text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                    className="w-full bg-transparent py-2.5 pl-1.5 text-sm text-gray-800 outline-none placeholder:text-gray-400"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <CustomSelect
                  variant="line"
                  className="w-full"
                  value={form.category}
                  onChange={(v) => set("category", v)}
                  options={categories.map((c) => ({ value: c, label: cap(c) }))}
                  placeholder="Select a category"
                />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between border border-gray-100 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-primary">Visible in shop</p>
                <p className="text-xs text-text-muted">Active products are shown to donors and customers.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.isActive}
                onClick={() => set("isActive", !form.isActive)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                  form.isActive ? "bg-accent" : "bg-gray-300",
                )}
              >
                <span
                  className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
                  style={{ transform: form.isActive ? "translateX(22px)" : "translateX(2px)" }}
                />
              </button>
            </div>
          </div>

          {/* Right: image + live preview */}
          <div className="space-y-6">
            <div className="border border-gray-100 bg-white p-5 shadow-sm">
              <label className={labelCls}>Product image {!isEdit && <span className="text-accent">· required</span>}</label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  pickImage(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "group relative grid h-52 cursor-pointer place-items-center overflow-hidden border-2 border-dashed transition-colors",
                  drag ? "border-accent bg-accent/5" : "border-gray-200 bg-gray-50 hover:border-accent/60",
                )}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="preview" className="h-full w-full object-contain p-2" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagePreview("");
                        setImageFile(null);
                      }}
                      className="absolute right-2 top-2 grid h-7 w-7 place-items-center bg-black/50 text-white transition-colors hover:bg-black/70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute inset-0 hidden items-center justify-center gap-1.5 bg-black/40 text-white group-hover:flex">
                      <UploadCloud className="h-4 w-4" /> <span className="text-xs font-medium">Replace</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-accent shadow-sm ring-1 ring-gray-100">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-primary">Click or drag &amp; drop</p>
                    <p className="text-xs text-text-muted">PNG, JPG or WebP, up to 5MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  pickImage(e.target.files?.[0]);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              />
            </div>

            {/* Live shop preview */}
            <div className="border border-gray-100 bg-white p-5 shadow-sm">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Shop preview</p>
              <div className="overflow-hidden border border-gray-100">
                <div className="aspect-[4/3] bg-gray-50">
                  {imagePreview ? (
                    <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-gray-300">
                      <Package className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">{cap(form.category)}</span>
                  <h3 className="line-clamp-1 text-[13px] font-semibold text-primary">{form.title || "Product title"}</h3>
                  <p className="mt-1 text-sm font-bold text-primary">
                    {form.price ? `$${Number(form.price).toFixed(2)}` : "$0.00"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Link
            to="/admin/products"
            className="inline-flex items-center border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? (isEdit ? "Updating…" : "Creating…") : isEdit ? "Update product" : "Create product"}
          </button>
        </div>
      </form>

      {/* Delete confirmation */}
      <Portal>
      <AnimatePresence>
        {deleteOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !deleting && setDeleteOpen(false)}
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
              <h3 className="text-base font-semibold text-primary">Delete “{form.title || "this product"}”?</h3>
              <p className="mt-1 text-sm text-text-muted">
                This permanently removes the product. This can't be undone.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
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
}
