import { useState, useEffect, useRef } from "react";
import {
  Phone, MapPin, Globe, ChevronRight,
  Gavel, Briefcase, Users, Shield, Building2,
  Award, Scale, BookOpen, Clock, CheckCircle,
  Trophy, Star, ArrowRight, Quote, CreditCard,
  Upload, X as XIcon, Image as ImageIcon, Loader2, AlertCircle
} from "lucide-react";
import { fetchTestimonials, createTestimonial, uploadTestimonialImages, fetchPublicBanners, fetchCourses } from '../utils/api';
import { Link } from 'react-router-dom';

interface BannerItem {
  id: string;
  title?: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
}

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function Hero() {
  return (
    <section id="hero" className="pt-24 pb-12 md:pt-32 md:pb-24 relative overflow-hidden flex items-center min-h-[500px]">
      {/* Utilisation de bg-position-[center_25%] pour un compromis parfait entre le haut de l'image (tête) et le bas (corps) */}
      <div className="absolute inset-0 z-0 bg-cover bg-position-[center_25%] bg-no-repeat" style={{ backgroundImage: "url('/images/hero_bg.png')" }}></div>
      <div className="absolute inset-0 z-0" style={{ backgroundImage: 'linear-gradient(to right, rgba(0,18,41,0.25), rgba(0,18,41,0.1), transparent)' }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="max-w-2xl">
          <div className="inline-block px-3 py-1 mb-4 border border-[#FF6B00]/30 bg-[#FF6B00]/10 rounded-full">
            <span className="text-[#FF6B00] text-xs font-bold uppercase tracking-wider">L'école de référence en CI</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4 shadow-sm">
            Votre réussite, <br className="hidden md:block" />
            <span className="text-[#FF6B00]">notre priorité absolue.</span>
          </h1>
          <p className="text-gray-200 text-sm md:text-base mb-8 max-w-lg leading-relaxed drop-shadow-md">
            Préparez vos concours de la Magistrature, de l'ENA, du Greffe, du Notariat et de la Police avec les meilleurs formateurs de Côte d'Ivoire.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/students/new" className="px-6 py-2.5 bg-[#FF6B00] text-white font-bold text-sm rounded hover:bg-[#e65c00] transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-orange-500/30">
              Découvrir les formations <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsRibbon() {
  const stats = [
    { n: "10", l: "Admis Magistrature" },
    { n: "8", l: "Admis ENA 2025" },
    { n: "5+", l: "Villes couvertes" },
    { n: "100%", l: "En ligne et présentiel" },
  ];
  return (
    <div className="bg-white border-b border-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-gray-100">
          {stats.map((s, i) => (
            <div key={i} className="text-center px-2">
              <div className="text-2xl font-black text-[#002855]">{s.n}</div>
              <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Actualite() {
  const { ref, inView } = useInView();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [featuredItems, setFeaturedItems] = useState<BannerItem[]>([]);

  // Liste des images d'actualité par défaut si aucune bannière n'est disponible.
  const images = [
    "/images/image2.jpeg",
    "/images/image1.jpeg",
    "/images/image3.jpeg",
    "/images/images4.jpeg"
  ];

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const banners = await fetchPublicBanners();
        const featured = Array.isArray(banners)
          ? banners.filter((b: any) => b.featured && b.isActive && b.imageUrl).slice(0, 3)
          : [];
        setFeaturedItems(featured);
      } catch (error) {
        console.error('Impossible de charger les éléments à la une', error);
      }
    };

    loadFeatured();
  }, []);

  const slides = featuredItems.length > 0 ? featuredItems : images;

  // Reset slider index if the slide count changes to avoid out-of-range translation.
  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
    }
  }, [slides.length, currentIndex]);

  // Auto-slide effect
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4000); // Défilement toutes les 4 secondes
    return () => clearInterval(interval);
  }, [slides.length, isPaused]);

  return (
    <section id="actualite" className="py-12 bg-gray-50">
      <div ref={ref} className={`max-w-4xl mx-auto px-4 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#002855]">À la une</h2>
          <div className="w-12 h-1 bg-[#FF6B00] mx-auto mt-2"></div>
        </div>

        <div
          className="relative max-w-2xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div
              className="w-full flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {slides.map((slide, i) => {
                const src = typeof slide === 'string' ? slide : slide.imageUrl || '/images/image2.jpeg';

                return (
                  <div key={i} className="w-full shrink-0 relative bg-gray-50 rounded-lg overflow-hidden group flex items-center justify-center" style={{ height: "420px" }}>
                    <img
                      src={src}
                      alt={`Actualité ${i + 1}`}
                      className="w-full h-full object-contain rounded-lg transition-transform duration-500 ease-out group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Dots */}
          {slides.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`transition-all duration-300 rounded-full ${currentIndex === i
                    ? "w-8 h-2.5 bg-[#FF6B00]"
                    : "w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400"
                    }`}
                  aria-label={`Aller à l'image ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Atouts() {
  const { ref, inView } = useInView();
  const atouts = [
    { icon: <Trophy size={20} />, title: "Taux de réussite élevé", desc: "20% d'admis en Magistrature dès 2022, 15% en ENA 2023, et des dizaines d'admis chaque année." },
    { icon: <Users size={20} />, title: "Formateurs Experts", desc: "Encadrement assuré par des professionnels chevronnés et juristes de haut niveau." },
    { icon: <MapPin size={20} />, title: "Couverture Nationale", desc: "Présent à Abidjan, Yamoussoukro, Bouaké, Daloa et Korhogo pour être au plus près de vous." },
    { icon: <Globe size={20} />, title: "Hybride & Diaspora", desc: "Suivez nos cours 100% en ligne via Google Meet ou Zoom, où que vous soyez dans le monde." },
  ];
  return (
    <section id="atouts" className="py-12 bg-white">
      <div ref={ref} className={`max-w-7xl mx-auto px-4 transition-all duration-700 ${inView ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#002855]">Pourquoi Excellence Académie ?</h2>
          <div className="w-12 h-1 bg-[#FF6B00] mx-auto mt-2"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {atouts.map((a, i) => (
            <div key={i} className="p-4 border border-gray-100 rounded-lg hover:shadow-md transition-shadow bg-gray-50/50">
              <div className="w-10 h-10 bg-[#002855]/5 text-[#002855] rounded flex items-center justify-center mb-3">
                {a.icon}
              </div>
              <h3 className="font-bold text-sm mb-2 text-gray-900">{a.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Formations() {
  const { ref, inView } = useInView();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const defaultForms = [
    { title: "Magistrature", category: "Concours Juridiques & Judiciaires", price: 35000, monthlyFee: 30000, hasPresentiel: true, hasOnline: true },
    { title: "ENA (Tous cycles)", category: "Administration Publique", price: 35000, monthlyFee: 30000, hasPresentiel: true, hasOnline: true },
    { title: "Greffe", category: "Concours Juridiques & Judiciaires", price: 35000, monthlyFee: 30000, hasPresentiel: true, hasOnline: true },
    { title: "Police", category: "Sécurité & Force Publique", price: 35000, monthlyFee: 30000, hasPresentiel: true, hasOnline: true },
    { title: "Avocature & Notariat", category: "Concours Juridiques & Judiciaires", price: 35000, monthlyFee: 30000, hasPresentiel: true, hasOnline: true },
    { title: "Fonction Publique", category: "Administration Publique", price: 35000, monthlyFee: 30000, hasPresentiel: true, hasOnline: true },
    { title: "EPPJEJ & EPP", category: "Administration Publique", price: 35000, monthlyFee: 30000, hasPresentiel: true, hasOnline: true },
    { title: "Informatique", category: "Technologies & Métiers Numériques", price: 35000, monthlyFee: 25000, hasPresentiel: true, hasOnline: true },
  ];

  useEffect(() => {
    fetchCourses()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCourses(data);
        } else {
          setCourses(defaultForms);
        }
      })
      .catch(() => setCourses(defaultForms))
      .finally(() => setLoading(false));
  }, []);

  const displayCourses = courses.length > 0 ? courses : defaultForms;

  const getIcon = (title: string = '', category: string = '') => {
    const t = (title + ' ' + category).toLowerCase();
    if (t.includes('magistr') || t.includes('greff')) return <Gavel size={18} />;
    if (t.includes('ena') || t.includes('fonction') || t.includes('epp')) return <Building2 size={18} />;
    if (t.includes('police') || t.includes('sécurité') || t.includes('securite')) return <Shield size={18} />;
    if (t.includes('avocat') || t.includes('notari') || t.includes('droit')) return <Scale size={18} />;
    if (t.includes('info') || t.includes('numériqu') || t.includes('techno')) return <Award size={18} />;
    return <BookOpen size={18} />;
  };

  return (
    <section id="formations" className="py-12 bg-gray-50 border-y border-gray-100">
      <div ref={ref} className={`max-w-7xl mx-auto px-4 transition-all duration-700 ${inView ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#002855]">Nos Formations & Concours</h2>
          <div className="w-12 h-1 bg-[#FF6B00] mx-auto mt-2 mb-3"></div>
          <p className="text-xs text-gray-600 max-w-xl mx-auto">
            Découvrez nos cycles préparatoires d'excellence encadrés par des magistrats, hauts fonctionnaires et experts du domaine.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {displayCourses.map((f, i) => {
            const mFee = f.monthlyFee !== undefined && f.monthlyFee !== null ? Number(f.monthlyFee) : 30000;
            return (
              <div key={f.id || i} className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between gap-2.5 hover:border-[#002855]/40 hover:shadow-sm transition-all group">
                <div className="flex items-start gap-3">
                  <div className="text-[#FF6B00] group-hover:scale-110 transition-transform mt-0.5">
                    {getIcon(f.title, f.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-gray-900 block group-hover:text-[#0056B3] transition-colors truncate">
                      {f.title}
                    </span>
                    {f.category && (
                      <span className="text-[10px] text-gray-500 font-medium block truncate">
                        {f.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px]">
                  <div className="flex items-center gap-1">
                    {f.hasPresentiel !== false && (
                      <span className="text-[9px] font-bold text-[#0056B3] bg-blue-50 px-1 py-0.2 rounded">
                        Présentiel
                      </span>
                    )}
                    {f.hasOnline !== false && (
                      <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1 py-0.2 rounded">
                        En ligne
                      </span>
                    )}
                  </div>
                  <span className="font-black text-[#FF6B00]">
                    {mFee.toLocaleString('fr-FR')} F<span className="text-[9px] font-normal text-gray-400">/m</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Tarifs() {
  const { ref, inView } = useInView();

  const paymentMethods = [
    { name: "Wave", logo: "/images/logo-wave.png" },
    { name: "Orange Money", logo: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg" },
    { name: "MTN MoMo", logo: "https://upload.wikimedia.org/wikipedia/commons/a/af/MTN_Logo.svg" },
    { name: "Moov Money", logo: "/images/moov.png" },
    { name: "Espèces", icon: <CreditCard size={24} className="text-emerald-600" /> },
  ];

  return (
    <section id="tarifs" className="py-12 bg-white">
      <div ref={ref} className={`max-w-5xl mx-auto px-4 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#002855]">Tarifs & Inscription</h2>
          <div className="w-12 h-1 bg-[#FF6B00] mx-auto mt-2"></div>
        </div>
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><CheckCircle size={16} className="text-[#FF6B00]" /> Frais d'Inscription</h3>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex justify-between border-b border-gray-200 pb-1"><span>Présentiel - Abidjan/Ligne</span> <span className="font-bold text-gray-900">45.000 F</span></li>
              <li className="flex justify-between border-b border-gray-200 pb-1"><span>Présentiel - Intérieur</span> <span className="font-bold text-gray-900">35.000 F</span></li>
              <li className="flex justify-between pb-1"><span>Diaspora</span> <span className="font-bold text-gray-900">100.000 F</span></li>
            </ul>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Clock size={16} className="text-[#FF6B00]" /> Mensualités</h3>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex justify-between border-b border-gray-200 pb-1"><span>Présentiel Abidjan</span> <span className="font-bold text-gray-900">30.000 F/mois</span></li>
              <li className="flex justify-between border-b border-gray-200 pb-1"><span>Hybride Abidjan</span> <span className="font-bold text-gray-900">35.000 F/mois</span></li>
              <li className="flex justify-between pb-1"><span>En Ligne / Intérieur</span> <span className="font-bold text-gray-900">25.000 F/mois</span></li>
            </ul>
          </div>
        </div>

        {/* Moyens de Paiement */}
        <div className="bg-white border border-gray-100 p-5 rounded-lg">
          <div className="flex justify-center mb-5">
            <Link to="/students/new" className="px-6 py-2 rounded-full bg-[#FF6B00] text-white font-bold text-sm hover:bg-[#e65c00] transition-colors">
              Rejoins-nous maintenant
            </Link>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-4 mb-5">
            {paymentMethods.map((m, i) => (
              <div key={i} className="flex flex-col items-center justify-center bg-gray-50 p-3 rounded-lg border border-gray-100 w-24 hover:shadow-sm transition-shadow">
                <div className="h-10 flex items-center justify-center mb-2">
                  {m.icon ? m.icon : <img src={m.logo} alt={m.name} className="h-full object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.25'; }} />}
                </div>
                <span className="text-[10px] font-bold text-gray-600 text-center leading-tight">{m.name}</span>
              </div>
            ))}
          </div>
          <h3 className="font-bold text-sm text-center text-gray-800 mb-4">Modalités de Paiement Acceptées</h3>
          <p className="text-center text-sm text-gray-500">Payez en toute simplicité avec Wave, Orange Money, MTN MoMo ou en espèces.</p>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTestimonials()
      .then(d => { if (Array.isArray(d)) setData(d); })
      .catch(() => setError("Impossible de charger les avis"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (data.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % data.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [data.length, isPaused]);

  const resetForm = () => {
    setFormError(null);
    setFormSuccess(false);
    setImages([]);
    setMessageCount(0);
  };

  const handleOpenModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const total = images.length + files.length;
    if (total > 3) {
      setFormError("Maximum 3 images autorisées.");
      if (e.target) e.target.value = '';
      return;
    }
    setFormError(null);
    setUploadingImages(true);
    try {
      const urls = await uploadTestimonialImages(files);
      setImages(prev => [...prev, ...urls]);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setUploadingImages(false);
      if (e.target) e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);
    setFormSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await createTestimonial({
        name: formData.get('name') as string,
        course: formData.get('course') as string,
        message: formData.get('message') as string,
        rating: parseInt(formData.get('rating') as string) || 5,
        images: images,
      });
      setFormSuccess(true);
      form.reset();
      setImages([]);
      setMessageCount(0);
      setTimeout(() => {
        handleCloseModal();
        setTimeout(() => setFormSuccess(false), 300);
      }, 2500);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  if (error) return null;
  if (loading) return (
    <section className="py-16 bg-gray-50 border-t border-gray-100">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-black text-[#002855] mb-2">Ils nous font confiance</h2>
        <div className="w-16 h-1.5 bg-[#FF6B00] mx-auto rounded-full mb-12"></div>
        <div className="flex justify-center">
          <div className="w-full max-w-2xl h-64 bg-gray-200 rounded-3xl animate-pulse" />
        </div>
      </div>
    </section>
  );
  if (data.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-linear-to-b from-gray-50 to-white relative overflow-hidden border-t border-gray-100">
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-60"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-orange-50 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 opacity-60"></div>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-[#002855] mb-4">Ils nous font confiance</h2>
          <div className="w-16 h-1.5 bg-[#FF6B00] mx-auto rounded-full mb-4"></div>
          <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">
            Découvrez les retours d'expérience de nos étudiants qui ont préparé et réussi leurs concours avec Excellence Académie.
          </p>
        </div>

        <div
          className="relative max-w-3xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {data.map((t, i) => (
                <div key={t.id || i} className="w-full min-w-full shrink-0 p-8 md:p-12 flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    {t.images && t.images.length > 0 ? (
                      <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg">
                        <img src={t.images[0]} alt={t.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-linear-to-br from-[#002855] to-[#004080] flex items-center justify-center text-white text-xl font-bold shadow-lg">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -bottom-2 -right-2 bg-[#FF6B00] text-white p-1.5 rounded-full shadow-md">
                      <Quote size={14} fill="currentColor" />
                    </div>
                  </div>

                  {t.images && t.images.length > 1 && (
                    <div className="flex gap-1 mb-3">
                      {t.images.slice(1).map((img: string, idx: number) => (
                        <div key={idx} className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex text-yellow-400 mb-4 gap-1">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} size={16} fill={j < (t.rating || 5) ? "currentColor" : "none"} className={j >= (t.rating || 5) ? "text-gray-300" : ""} />
                    ))}
                  </div>

                  <p className="text-gray-700 text-lg md:text-xl italic font-medium mb-8 leading-relaxed">
                    "{t.message}"
                  </p>

                  <div className="mt-auto">
                    <div className="font-bold text-[#002855] text-base md:text-lg">{t.name}</div>
                    <div className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider mt-1 px-3 py-1 bg-orange-50 rounded-full inline-block">
                      {t.course}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {data.length > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {data.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`transition-all duration-300 rounded-full ${currentIndex === i
                    ? "w-8 h-2.5 bg-[#FF6B00]"
                    : "w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400"
                    }`}
                  aria-label={`Aller à l'avis ${i + 1}`}
                />
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-[#002855] text-[#002855] font-bold rounded-xl hover:bg-[#002855] hover:text-white transition-colors"
            >
              Donner votre avis
            </button>
          </div>
        </div>
      </div>

      {/* Testimonial Form Modal */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${modalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ backgroundColor: modalOpen ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)', backdropFilter: modalOpen ? 'blur(4px)' : 'none' }}
        onClick={e => { if (e.target === e.currentTarget) handleCloseModal(); }}>
        <div className={`bg-white rounded-2xl w-full max-w-lg relative shadow-2xl flex flex-col max-h-[90vh] transition-all duration-300 ${modalOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}>
          <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
            <div>
              <h3 className="text-xl font-bold text-[#002855]">Partagez votre expérience</h3>
              <p className="text-gray-500 text-sm mt-1">Votre avis nous aide à nous améliorer</p>
            </div>
            <button onClick={handleCloseModal} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors">
              <XIcon size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl flex items-center gap-2">
                <CheckCircle size={16} />
                <span>Merci ! Votre avis a été soumis et sera publié après validation.</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom (ou pseudo) *</label>
              <input name="name" type="text" required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none transition-colors"
                placeholder="Ex: Jean D." />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Formation suivie *</label>
              <input name="course" type="text" required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none transition-colors"
                placeholder="Ex: ENA Cycle Moyen" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Note sur 5 *</label>
              <select name="rating" required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none transition-colors bg-white">
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Très bien</option>
                <option value="3">3 - Bien</option>
                <option value="2">2 - Moyen</option>
                <option value="1">1 - Décevant</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Votre avis *</label>
              <textarea name="message" required rows={4} maxLength={500}
                onChange={e => setMessageCount(e.target.value.length)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none transition-colors resize-none"
                placeholder="Partagez votre expérience..."></textarea>
              <p className="text-xs text-gray-400 mt-1 text-right">{messageCount}/500</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Photos (max 3)</label>
              <div className="flex items-center gap-3 flex-wrap">
                {images.length < 3 && (
                  <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#0056B3] hover:bg-blue-50 transition-all">
                    {uploadingImages ? (
                      <Loader2 size={20} className="text-gray-400 animate-spin" />
                    ) : (
                      <>
                        <Upload size={20} className="text-gray-400" />
                        <span className="text-xs text-gray-400 mt-1">Ajouter</span>
                      </>
                    )}
                    <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" disabled={uploadingImages} />
                  </label>
                )}
                {images.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
                    <img src={url} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                      <XIcon size={10} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">{images.length}/3 image(s)</p>
            </div>

            <button type="submit" disabled={formSubmitting || formSuccess}
              className="w-full py-3.5 bg-[#FF6B00] text-white font-bold rounded-xl hover:bg-[#e65c00] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {formSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
              {formSubmitting ? 'Envoi...' : 'Envoyer mon avis'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}



export default function LandingPage() {
  return (
    <div className="min-h-screen font-sans text-gray-800 bg-white selection:bg-[#FF6B00] selection:text-white animate-fadeIn">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeInUp 0.5s ease-out forwards; }
      `}</style>
      <Hero />
      <StatsRibbon />
      <Actualite />
      <Atouts />
      <Formations />
      <Tarifs />
      <Testimonials />
    </div>
  );
}
