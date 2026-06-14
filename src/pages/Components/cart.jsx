import { useState, useContext, createContext, useEffect, useRef } from "react";
import { X, Plus, Minus, ShoppingBag, ChevronUp, ArrowRight, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
  // Increments on every add — drives a subtle pulse on the bottom bar so a new
  // item is noticed without forcing the full sheet open.
  const [bump, setBump] = useState(0);

  const addItem = (item) => {
    setItems((prev) => {
      const existingItem = prev.find((i) => i.id === item.id);
      if (existingItem) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1, donationType: item.donationType || "Sadaqah" }];
    });
    setBump((b) => b + 1);
  };

  const removeItem = (itemId) => setItems((prev) => prev.filter((item) => item.id !== itemId));

  const updateQuantity = (itemId, delta) =>
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)),
    );

  const clearCart = () => setItems([]);

  const UpdateItemType = (itemId, type) =>
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, donationType: type } : item)));

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ isOpen, setIsOpen, items, addItem, removeItem, updateQuantity, clearCart, total, UpdateItemType, bump }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};

const getImage = (item) => item.image || null;

const Cart = () => {
  const { isOpen, setIsOpen, items, removeItem, updateQuantity, total, bump } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // The dedicated checkout/confirmation pages already show the full cart.
  const hiddenHere = ["/checkout", "/order-confirmation"].includes(location.pathname);

  // Subtle pulse on the bottom bar when an item is added.
  const [pulse, setPulse] = useState(false);
  const prevBump = useRef(bump);
  useEffect(() => {
    if (bump === prevBump.current) return;
    prevBump.current = bump;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 360);
    return () => clearTimeout(t);
  }, [bump]);

  // Lock body scroll while the expanded sheet is open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (hiddenHere) return null;

  return (
    <>
      {/* ── Persistent bottom mini-bar ── */}
      <AnimatePresence>
        {items.length > 0 && !isOpen && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] px-4 pb-4"
          >
            <div
              className={`pointer-events-auto mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-black/[0.06] bg-white/90 p-2 shadow-[0_10px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl transition-transform duration-300 ${pulse ? "scale-[1.03]" : "scale-100"}`}
            >
              {/* Expand trigger */}
              <button
                onClick={() => setIsOpen(true)}
                className="flex flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-gray-50"
                aria-label="View cart"
              >
                <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                  <ShoppingBag className="h-5 w-5" />
                  <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                    {items.length}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Your donation</span>
                  <span className="block font-heading text-base font-bold leading-tight text-primary">${total.toFixed(2)}</span>
                </span>
                <ChevronUp className="ml-1 h-4 w-4 shrink-0 text-text-muted" />
              </button>

              <button
                onClick={() => navigate("/checkout")}
                className="shrink-0 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-light"
              >
                Checkout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Expanded bottom sheet ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-h-[86vh] w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-2xl"
            >
              {/* Drag handle */}
              <div className="flex shrink-0 justify-center pt-3">
                <span className="h-1.5 w-10 rounded-full bg-gray-200" />
              </div>

              {/* Header */}
              <div className="flex shrink-0 items-center justify-between px-6 py-4">
                <div>
                  <h2 className="font-heading text-lg font-bold text-primary">Your donations</h2>
                  <p className="text-xs text-text-muted">{items.length} {items.length === 1 ? "item" : "items"}</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full text-text-muted transition-colors hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent">
                    <ShoppingBag className="h-6 w-6" />
                  </span>
                  <p className="font-heading text-base font-bold text-primary">No donations yet</p>
                  <p className="mt-1 text-sm text-text-muted">Browse our causes and start giving.</p>
                  <button
                    onClick={() => { setIsOpen(false); navigate("/donate"); }}
                    className="mt-5 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
                  >
                    Explore causes
                  </button>
                </div>
              ) : (
                <>
                  {/* Items */}
                  <div className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto px-6">
                    {items.map((item, index) => {
                      const img = getImage(item);
                      // Hide the cause line when it just repeats the title (e.g. "Zakat ul Maal").
                      const showType = item.donationType && item.donationType !== item.title;
                      return (
                        <div key={item.id ?? item.title} className="flex items-center gap-4 py-4">
                          {img ? (
                            <img src={img} alt={item.title} className="h-12 w-12 shrink-0 rounded-xl object-cover" loading="lazy" />
                          ) : (
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/10 font-heading text-lg font-bold text-accent">
                              {index + 1}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-primary">{item.title}</p>
                            {showType ? <p className="truncate text-xs text-text-muted">{item.donationType}</p> : null}
                            <p className="mt-1 font-heading text-sm font-bold text-accent">${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <button onClick={() => removeItem(item.id)} className="text-text-muted transition-colors hover:text-red-500" aria-label="Remove">
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
                              <button onClick={() => updateQuantity(item.id, -1)} className="grid h-7 w-7 place-items-center rounded-md text-text-muted transition-all hover:bg-white hover:text-primary" aria-label="Decrease">
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-7 text-center text-sm font-semibold text-primary">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="grid h-7 w-7 place-items-center rounded-md text-text-muted transition-all hover:bg-white hover:text-primary" aria-label="Increase">
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="shrink-0 border-t border-gray-100 px-6 py-5">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm text-text-muted">Subtotal</span>
                      <span className="font-heading text-xl font-bold text-primary">${total.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsOpen(false)}
                        className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-primary transition-colors hover:bg-gray-50"
                      >
                        Continue
                      </button>
                      <button
                        onClick={() => { setIsOpen(false); navigate("/checkout"); }}
                        className="inline-flex flex-[2] items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
                      >
                        Checkout
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Cart;
