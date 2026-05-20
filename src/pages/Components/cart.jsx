import React, { useState, useContext, createContext, useEffect } from "react";
import { X, Plus, Minus, ShoppingCart, ArrowRight, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);


  const addItem = (item) => {
    setItems((prev) => {
      const existingItem = prev.find((i) => i.id === item.id);
      if (existingItem) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        { ...item, quantity: 1, donationType: item.donationType || "Sadaqah" },
      ];
    });
    setIsOpen(true);
  };

  const removeItem = (itemId) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId, delta) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const UpdateItemType = (itemId, type) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, donationType: type } : item
      )
    );
  };

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        isOpen,
        setIsOpen,
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        isAnimating,
        UpdateItemType,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

const Cart = () => {
  const {
    isOpen,
    setIsOpen,
    items,
    removeItem,
    updateQuantity,
    total,
  } = useCart();

  const navigate = useNavigate();

  const getImage = (item) => {
    if (item.image) return item.image;
    return null;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[420px] z-[70] transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col bg-background shadow-2xl">
          {/* Header */}
          <div className="px-6 py-5 flex justify-between items-center border-b border-gray-200/60">
            <div>
              <h2 className="text-lg font-heading font-bold text-text-dark">Your Donations</h2>
              <p className="text-xs text-text-muted font-body mt-0.5">
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-text-muted hover:text-text-dark hover:border-gray-300 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Empty state */}
          {items.length === 0 && (
            <div className="flex-1 flex items-center justify-center px-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-7 h-7 text-accent" />
                </div>
                <p className="font-heading text-lg font-bold text-text-dark mb-1">No donations yet</p>
                <p className="text-sm text-text-muted font-body">Browse our causes and start giving</p>
                <button
                  onClick={() => { setIsOpen(false); navigate("/donate"); }}
                  className="mt-5 px-6 py-2.5 rounded-xl text-sm font-semibold font-body text-white bg-accent hover:bg-accent/90 shadow-md"
                >
                  Explore Causes
                </button>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {items.map((item, index) => {
              const img = getImage(item);
              return (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {/* Image or icon */}
                  {img ? (
                    <img
                      src={img}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                      loading="lazy"
                      alt={item.title}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Heart className="w-6 h-6 text-accent" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-body font-semibold text-sm text-text-dark truncate">{item.title}</h3>
                    <p className="text-accent font-heading font-bold text-base mt-0.5">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col items-end justify-between flex-shrink-0">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-text-muted hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-1 bg-background rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white text-text-muted hover:text-text-dark transition-all"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-sm font-semibold font-body text-text-dark">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white text-text-muted hover:text-text-dark transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="px-6 py-5 border-t border-gray-200/60 bg-white">
              {/* Total */}
              <div className="flex justify-between items-center mb-5">
                <span className="text-sm text-text-muted font-body">Subtotal</span>
                <span className="text-xl font-heading font-bold text-text-dark">${total.toFixed(2)}</span>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold font-body text-text-dark bg-background border border-gray-200 hover:bg-gray-100 transition-all"
                >
                  Continue
                </button>
                <button
                  onClick={() => { setIsOpen(false); navigate("/checkout"); }}
                  className="flex-[2] py-3 rounded-xl text-sm font-semibold font-body text-white bg-accent hover:bg-accent/90 shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                >
                  Checkout
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Cart;
