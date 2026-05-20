import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Calendar, Users, ArrowRight, X, ChevronLeft, ChevronRight } from "lucide-react";
import programService from "../../services/program.service";
import toast from "react-hot-toast";
import Loader from "../../components/Loader";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.08 },
  }),
};

export default function ProgramDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [donateAmount, setDonateAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetch = async () => {
      try {
        const res = await programService.getById(id);
        setProgram(res.data);
        setSelectedImage(res.data.coverImageIndex || 0);
      } catch {
        console.error("Failed to fetch program");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const activeAmount = customAmount || donateAmount;

  const handleDonate = () => {
    if (!activeAmount || parseFloat(activeAmount) <= 0) {
      toast.error("Please select or enter a donation amount");
      return;
    }
    navigate("/program-checkout", {
      state: { program, amount: parseFloat(activeAmount) },
    });
  };

  if (loading) return <Loader />;

  if (!program) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-muted">Program not found</p>
      </div>
    );
  }

  const pct = program.goalAmount > 0
    ? Math.min(100, Math.round((program.raisedAmount / program.goalAmount) * 100))
    : 0;
  const remaining = Math.max(0, program.goalAmount - program.raisedAmount);
  const images = program.images || [];
  const isPublished = program.status === "published";

  return (
    <div className="min-h-screen bg-background py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.button onClick={() => navigate("/programs")}
          className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 font-medium mb-6 group"
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Programs
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column — Program info */}
          <motion.div className="lg:col-span-3" initial="hidden" animate="visible">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-accent to-accent-light" />

              {/* Image gallery */}
              {images.length > 0 && (
                <div>
                  <img src={images[selectedImage]?.url} alt={program.title}
                    className="w-full h-64 md:h-80 object-cover" />
                  {images.length > 1 && (
                    <div className="flex gap-2 p-3 bg-gray-50 overflow-x-auto">
                      {images.map((img, i) => (
                        <button key={i} onClick={() => setSelectedImage(i)}
                          className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                            selectedImage === i ? "border-accent shadow-md" : "border-transparent opacity-70 hover:opacity-100"
                          }`}>
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="p-6 md:p-8">
                <motion.div className="flex items-start justify-between mb-4" variants={fadeUp} custom={0}>
                  <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">{program.title}</h1>
                  <span className={`text-xs font-medium px-3 py-1.5 rounded-full capitalize ${
                    isPublished ? "bg-green-50 text-green-700 ring-1 ring-green-100"
                    : program.status === "completed" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                    : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
                  }`}>{program.status}</span>
                </motion.div>

                {program.description && (
                  <motion.p variants={fadeUp} custom={1} className="text-text-muted mb-6 leading-relaxed font-body">
                    {program.description}
                  </motion.p>
                )}

                {/* Progress section */}
                <motion.div variants={fadeUp} custom={2} className="bg-background rounded-xl p-5 mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-2xl font-bold text-primary font-heading">${program.raisedAmount?.toLocaleString()}</p>
                      <p className="text-xs text-text-muted">raised of ${program.goalAmount?.toLocaleString()} goal</p>
                    </div>
                    <span className="text-lg font-bold text-accent">{pct}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
                    <motion.div className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: 0.3, ease: "easeOut" }} />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white rounded-lg p-3">
                      <Users className="w-4 h-4 text-accent mx-auto mb-1" />
                      <p className="text-sm font-semibold text-primary">{program.donors?.length || 0}</p>
                      <p className="text-[10px] text-text-muted">Donors</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <Heart className="w-4 h-4 text-accent mx-auto mb-1" />
                      <p className="text-sm font-semibold text-primary">${remaining.toLocaleString()}</p>
                      <p className="text-[10px] text-text-muted">Remaining</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <Calendar className="w-4 h-4 text-accent mx-auto mb-1" />
                      <p className="text-sm font-semibold text-primary">
                        {new Date(program.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                      </p>
                      <p className="text-[10px] text-text-muted">Started</p>
                    </div>
                  </div>
                </motion.div>

                {/* Follow-up updates */}
                {program.followUpUpdates?.length > 0 && (
                  <motion.div variants={fadeUp} custom={3}>
                    <h3 className="text-base font-semibold text-primary mb-4 font-heading">Program Updates</h3>
                    <div className="space-y-3">
                      {[...program.followUpUpdates]
                        .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
                        .map((update, i) => (
                          <div key={i} className="pl-4 py-3 border-l-2 border-accent/30 bg-background/50 rounded-r-lg pr-4">
                            <p className="text-sm text-primary leading-relaxed">{update.text}</p>
                            {update.images?.length > 0 && (
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {update.images.map((img, k) => (
                                  <button key={k} onClick={() => setLightbox({ images: update.images, index: k })} className="focus:outline-none">
                                    <img src={img} alt="" className="w-24 h-24 object-cover rounded-lg border border-gray-200 hover:ring-2 hover:ring-accent/40 transition-all cursor-zoom-in" />
                                  </button>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-text-muted mt-1.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(update.sentAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right column — Donate card */}
          <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="lg:sticky lg:top-24">
              {isPublished ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6">
                    <h3 className="text-lg font-heading font-bold text-primary mb-1">Make a Donation</h3>
                    <p className="text-xs text-text-muted mb-5">Your payment will be processed securely via Stripe</p>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[25, 50, 100, 250, 500, 1000].map((amt) => (
                        <button key={amt}
                          onClick={() => { setDonateAmount(String(amt)); setCustomAmount(""); }}
                          className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            donateAmount === String(amt) && !customAmount
                              ? "bg-accent text-white shadow-md"
                              : "bg-background text-primary border border-gray-200 hover:border-accent/30"
                          }`}>${amt}</button>
                      ))}
                    </div>

                    <div className="relative mb-5">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-semibold">$</span>
                      <input type="number" value={customAmount}
                        onChange={(e) => { setCustomAmount(e.target.value); setDonateAmount(""); }}
                        className="w-full pl-8 pr-4 py-3 bg-background border border-gray-200 rounded-xl text-sm font-body focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                        placeholder="Custom amount" min="1" />
                    </div>

                    <button onClick={handleDonate}
                      className="w-full py-3.5 bg-accent hover:bg-accent/90 text-white rounded-xl font-semibold font-body flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-accent/20 hover:scale-[1.01]">
                      <Heart className="w-4 h-4" />
                      Donate {activeAmount ? `$${activeAmount}` : "Now"}
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <p className="text-[10px] text-text-muted text-center mt-3">
                      You'll be taken to our secure checkout to complete your payment
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Heart className="w-6 h-6 text-text-muted" />
                  </div>
                  <p className="text-sm font-semibold text-primary mb-1">
                    {program.status === "completed" ? "Program Completed" : "Program Unavailable"}
                  </p>
                  <p className="text-xs text-text-muted">This program is no longer accepting donations.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div className="fixed inset-0 z-[80] flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setLightbox(null)} />
            <button onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
              <X className="w-5 h-5" />
            </button>
            {lightbox.images.length > 1 && (
              <>
                <button onClick={() => setLightbox((l) => ({ ...l, index: (l.index - 1 + l.images.length) % l.images.length }))}
                  className="absolute left-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setLightbox((l) => ({ ...l, index: (l.index + 1) % l.images.length }))}
                  className="absolute right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            <motion.img
              key={lightbox.index}
              src={lightbox.images[lightbox.index]}
              alt=""
              className="relative max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            {lightbox.images.length > 1 && (
              <div className="absolute bottom-4 text-white/60 text-sm">
                {lightbox.index + 1} / {lightbox.images.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
