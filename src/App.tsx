import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  School,
  MapPin,
  Bookmark,
  Check,
  ExternalLink,
  Phone,
  Calendar,
  Filter,
  Trash2,
  Loader2,
  X,
  Building2,
  ChevronRight,
  Copy,
  Info,
  Clock,
  Sparkles,
  Globe,
  Share2,
  RefreshCw,
  SlidersHorizontal,
  BookmarkCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// NEIS Open API Key (쉽게 교체할 수 있도록 상수로 분리)
const NEIS_API_KEY = "6c514420a932447da193272417931121";

interface School {
  ATPT_OFCDC_SC_CODE: string; // 시도교육청코드
  ATPT_OFCDC_SC_NM: string;   // 시도교육청명
  SD_SCHUL_CODE: string;      // 표준학교코드
  SCHUL_NM: string;           // 학교명
  ENG_SCHUL_NM: string;       // 영문학교명
  SCHUL_KND_SC_NM: string;    // 학교종류명 (초등학교, 중학교, 고등학교, 특수학교 등)
  LCTN_BGNG_NM: string;       // 소재지명
  JU_ORG_NM: string;          // 관할조직명
  FOND_SC_NM: string;         // 설립명 (공립, 사립, 국립)
  ORG_RDNZC: string;          // 도로명우편번호
  ORG_RDNMA: string;          // 도로명주소
  ORG_RDNDA: string;          // 도로명상세주소
  ORG_TELNO: string;          // 전화번호
  HMPG_ADRES: string;         // 홈페이지주소
  FOND_YMD: string;           // 설립일자
  COEDU_SC_NM: string;        // 남녀공학구분명 (남여공학, 남, 여)
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "info" | "error";
}

export default function App() {
  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  
  // Bookmarks & History
  const [savedSchools, setSavedSchools] = useState<School[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  // Filters
  const [filterRegion, setFilterRegion] = useState("전체");
  const [filterLevel, setFilterLevel] = useState("전체");
  const [filterType, setFilterType] = useState("전체"); // 국립, 공립, 사립
  const [showFilters, setShowFilters] = useState(false);

  // Decorative & Helper UI States
  const [toasts, setToasts] = useState<Toast[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load Initial Data (LocalStorage)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("saved_schools");
      if (saved) {
        setSavedSchools(JSON.parse(saved));
      }
      const history = localStorage.getItem("recent_searches");
      if (history) {
        setRecentSearches(JSON.parse(history));
      }
    } catch (e) {
      console.error("데이터 로드 중 오류 발생", e);
    }
  }, []);

  // Sync Saved Schools to LocalStorage
  const handleSaveToLocalStorage = (updated: School[]) => {
    setSavedSchools(updated);
    localStorage.setItem("saved_schools", JSON.stringify(updated));
  };

  // Add Toast
  const addToast = (message: string, type: Toast["type"] = "success") => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Search Logic
  const handleSearch = async (termToSearch = searchTerm, isAutomatic = false) => {
    const term = termToSearch.trim();
    if (!term) {
      addToast("학교명을 입력해주세요.", "error");
      return;
    }

    setLoading(true);
    setError(null);
    if (!isAutomatic) {
      setShowBookmarksOnly(false);
    }

    try {
      const response = await fetch(
        `https://open.neis.go.kr/hub/schoolInfo?KEY=${NEIS_API_KEY}&Type=json&pIndex=1&pSize=150&SCHUL_NM=${encodeURIComponent(
          term
        )}`
      );

      if (!response.ok) {
        throw new Error("서버와의 통신에 실패했습니다.");
      }

      const data = await response.json();

      // Check results
      if (data.RESULT) {
        // e.g., INFO-200 means no results
        const msg = data.RESULT.MESSAGE || "학교를 찾지 못했습니다.";
        setError(msg);
        setSchools([]);
        setSearchPerformed(true);
        addToast(msg, "info");
      } else if (data.schoolInfo && data.schoolInfo.length >= 2) {
        const rows: School[] = data.schoolInfo[1].row;
        setSchools(rows);
        setSearchPerformed(true);
        setError(null);
        addToast(`성공적으로 ${rows.length}개의 학교가 검색되었습니다.`);

        // Add to Recent Searches
        const updatedHistory = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 5);
        setRecentSearches(updatedHistory);
        localStorage.setItem("recent_searches", JSON.stringify(updatedHistory));

        // Auto select first school if available
        if (rows.length > 0) {
          setSelectedSchool(rows[0]);
        }
      } else {
        setError("검색 결과가 없습니다.");
        setSchools([]);
        setSearchPerformed(true);
      }
    } catch (err: any) {
      setError(err?.message || "데이터를 불러오는 데 실패했습니다.");
      setSchools([]);
      addToast("검색 중 네트워크 오류가 발생했습니다.", "error");
    } finally {
      setLoading(false);
      // Scroll to results smoothly
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  // Toggle Bookmark
  const toggleBookmark = (school: School, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isBookmarked = savedSchools.some((s) => s.SD_SCHUL_CODE === school.SD_SCHUL_CODE);
    let updated;
    if (isBookmarked) {
      updated = savedSchools.filter((s) => s.SD_SCHUL_CODE !== school.SD_SCHUL_CODE);
      addToast(`'${school.SCHUL_NM}'이(가) 관심 학교에서 삭제되었습니다.`, "info");
      // If deleted matches selected, update selection bookmarks state
    } else {
      updated = [...savedSchools, school];
      addToast(`'${school.SCHUL_NM}'이(가) 관심 학교로 등록되었습니다.`, "success");
    }
    handleSaveToLocalStorage(updated);
  };

  // Remove recent search
  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== term);
    setRecentSearches(updated);
    localStorage.setItem("recent_searches", JSON.stringify(updated));
    addToast("검색 기록이 삭제되었습니다.", "info");
  };

  // Copy to Clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${label}이(가) 클립보드에 복사되었습니다.`, "success");
  };

  // Format Founded Date
  const formatYMD = (ymdStr: string) => {
    if (!ymdStr || ymdStr.length !== 8) return ymdStr || "정보 없음";
    const year = ymdStr.substring(0, 4);
    const month = ymdStr.substring(4, 6);
    const day = ymdStr.substring(6, 8);
    return `${year}년 ${month}월 ${day}일`;
  };

  // Quick reset
  const handleReset = () => {
    setSearchTerm("");
    setSchools([]);
    setSearchPerformed(false);
    setSelectedSchool(null);
    setShowBookmarksOnly(false);
    setError(null);
    setFilterRegion("전체");
    setFilterLevel("전체");
    setFilterType("전체");
  };

  // Filter Logic (Client-side multi-filters on loaded schools or bookmarks)
  const displaySource = showBookmarksOnly ? savedSchools : schools;

  const filteredSchools = useMemo(() => {
    return displaySource.filter((school) => {
      // Region filter
      if (filterRegion !== "전체") {
        const regionMatch = school.LCTN_BGNG_NM && school.LCTN_BGNG_NM.includes(filterRegion);
        const officeMatch = school.ATPT_OFCDC_SC_NM && school.ATPT_OFCDC_SC_NM.includes(filterRegion);
        if (!regionMatch && !officeMatch) return false;
      }

      // Level filter (초등, 중학, 고등, 기타)
      if (filterLevel !== "전체") {
        if (filterLevel === "초등학교" && !school.SCHUL_KND_SC_NM.includes("초등학교")) return false;
        if (filterLevel === "중학교" && !school.SCHUL_KND_SC_NM.includes("중학교")) return false;
        if (filterLevel === "고등학교" && !school.SCHUL_KND_SC_NM.includes("고등학교")) return false;
        if (filterLevel === "기타") {
          const isStandard =
            school.SCHUL_KND_SC_NM.includes("초등학교") ||
            school.SCHUL_KND_SC_NM.includes("중학교") ||
            school.SCHUL_KND_SC_NM.includes("고등학교");
          if (isStandard) return false;
        }
      }

      // Type filter
      if (filterType !== "전체") {
        if (school.FOND_SC_NM !== filterType) return false;
      }

      return true;
    });
  }, [displaySource, filterRegion, filterLevel, filterType]);

  // Extract unique regions for the dropdown
  const regionsList = [
    "전체",
    "서울",
    "경기",
    "인천",
    "부산",
    "대구",
    "광주",
    "대전",
    "울산",
    "세종",
    "강원",
    "충북",
    "충남",
    "전북",
    "전남",
    "경북",
    "경남",
    "제주"
  ];

  // Colors based on School Level
  const getSchoolLevelBadgeColor = (level: string) => {
    if (level.includes("초등학교")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
    }
    if (level.includes("중학교")) {
      return "bg-sky-50 text-sky-700 border-sky-200/60";
    }
    if (level.includes("고등학교")) {
      return "bg-violet-50 text-violet-700 border-violet-200/60";
    }
    return "bg-amber-50 text-amber-700 border-amber-200/60";
  };

  const getSchoolLevelAccentColor = (level: string) => {
    if (level.includes("초등학교")) return "bg-emerald-600";
    if (level.includes("중학교")) return "bg-sky-600";
    if (level.includes("고등학교")) return "bg-violet-600";
    return "bg-amber-600";
  };

  const getSchoolLevelTextClass = (level: string) => {
    if (level.includes("초등학교")) return "text-emerald-600";
    if (level.includes("중학교")) return "text-sky-600";
    if (level.includes("고등학교")) return "text-violet-600";
    return "text-amber-600";
  };

  return (
    <div id="app-container" className="min-h-screen bg-slate-50 flex flex-col font-sans transition-all duration-300">
      
      {/* Toast Alert System */}
      <div id="toast-container" className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              id={`toast-${toast.id}`}
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium bg-white pointer-events-auto ${
                toast.type === "success"
                  ? "border-emerald-100 text-slate-800"
                  : toast.type === "error"
                  ? "border-rose-100 text-rose-800"
                  : "border-slate-100 text-slate-800"
              }`}
            >
              {toast.type === "success" && (
                <div className="p-1 rounded-full bg-emerald-100 text-emerald-600">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
              {toast.type === "error" && (
                <div className="p-1 rounded-full bg-rose-100 text-rose-600">
                  <X size={14} strokeWidth={3} />
                </div>
              )}
              {toast.type === "info" && (
                <div className="p-1 rounded-full bg-blue-100 text-blue-600">
                  <Info size={14} strokeWidth={3} />
                </div>
              )}
              <span className="flex-1">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Navigation Header */}
      <header id="nav-header" className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 transition-all duration-250">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div
            id="nav-logo"
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={handleReset}
          >
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-600/20 group-hover:bg-blue-700 transition-colors">
              <School size={20} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 tracking-tight text-base sm:text-lg flex items-center gap-1.5">
                스마트 스쿨 <span className="text-blue-600 font-medium text-sm hidden sm:inline px-1.5 py-0.5 rounded bg-blue-50">네비게이터</span>
              </h1>
            </div>
          </div>

          {/* Action Tabs */}
          <div id="nav-actions" className="flex items-center gap-2">
            
            {/* Saved Schools Toggle Button */}
            <button
              id="btn-saved-toggle"
              onClick={() => {
                setShowBookmarksOnly(!showBookmarksOnly);
                setSelectedSchool(null);
                setSearchPerformed(true);
                addToast(
                  !showBookmarksOnly 
                    ? `관심 학교 목록(${savedSchools.length}개)을 표시합니다.`
                    : "검색 전체 화면으로 돌아갑니다.", 
                  "info"
                );
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                showBookmarksOnly
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                  : "bg-blue-50/50 text-blue-600 hover:bg-blue-50 border border-blue-100/50"
              }`}
            >
              <BookmarkCheck size={16} className={showBookmarksOnly ? "fill-white" : ""} />
              <span className="hidden sm:inline">관심 학교</span>
              <span className={`px-1.5 py-0.2 text-xs rounded-full ${showBookmarksOnly ? "bg-white text-blue-600 font-bold" : "bg-blue-200/50 text-blue-700"}`}>
                {savedSchools.length}
              </span>
            </button>

            {/* Clear/Reset Button if active */}
            {searchPerformed && (
              <button
                id="btn-nav-home"
                onClick={handleReset}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                title="첫 화면으로 돌아가기"
              >
                <RefreshCw size={18} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main id="main-content" className="flex-grow flex flex-col">
        <AnimatePresence mode="wait">
          
          {/* 1. HERO / CENTER VIEW (No search performed yet) */}
          {!searchPerformed ? (
            <motion.div
              id="initial-hero-view"
              key="hero-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex-grow flex flex-col justify-center py-12 md:py-20 px-4 max-w-4xl mx-auto w-full"
            >
              {/* Decorative Accent */}
              <div className="flex justify-center mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold tracking-wide border border-blue-100/30">
                  <Sparkles size={12} className="text-blue-500 animate-pulse" />
                  전국 초·중·고 안전 검색 포털
                </span>
              </div>

              {/* Heading */}
              <div className="text-center mb-10">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  전국 학교 정보를 <br className="sm:hidden" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">한눈에 편리하게</span>
                </h2>
                <p className="mt-3 text-slate-500 text-sm sm:text-base max-w-lg mx-auto">
                  NEIS 초정밀 실시간 데이터베이스 연동. 교명만 입력하면 전국 모든 학군 상세 정보를 즉시 상세조회 및 비교 저장할 수 있습니다.
                </p>
              </div>

              {/* SEARCH BAR (Centered View) */}
              <div id="center-search-card" className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-2xl mx-auto w-full">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch();
                  }}
                  className="space-y-4"
                >
                  <div className="relative flex items-center">
                    <Search className="absolute left-4 text-slate-400 pointer-events-none" size={20} />
                    <input
                      id="input-school-name-center"
                      type="text"
                      className="w-full pl-12 pr-16 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-800 text-base font-medium placeholder-slate-400 transition-all shadow-inner"
                      placeholder="예: 서울대동초등학교, 영등포고등학교, 중학교"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    
                    {searchTerm && (
                      <button
                        id="btn-clear-center"
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="absolute right-14 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3">
                    <button
                      id="btn-search-center"
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-blue-600/10 focus:ring-4 focus:ring-blue-100 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          <span>불러오는 중...</span>
                        </>
                      ) : (
                        <>
                          <Search size={22} strokeWidth={2.5} />
                          <span>전국 학교 검색 시작</span>
                        </>
                      )}
                    </button>

                    <button
                      id="btn-toggle-filters-center"
                      type="button"
                      onClick={() => setShowFilters(!showFilters)}
                      className={`px-4 rounded-2xl border flex items-center justify-center transition-all ${
                        showFilters 
                          ? "bg-slate-100 border-slate-300 text-slate-800" 
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                      title="조건 필터"
                    >
                      <SlidersHorizontal size={20} />
                    </button>
                  </div>
                </form>

                {/* Centered Dynamic Filters Area */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      id="filters-drawer-center"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-6 pt-5 border-t border-slate-100 space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        {/* Region Selector */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                            <MapPin size={12} />
                            지역 선택
                          </label>
                          <select
                            id="select-region-center"
                            value={filterRegion}
                            onChange={(e) => setFilterRegion(e.target.value)}
                            className="w-full text-sm bg-slate-50 border border-slate-100 text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium cursor-pointer"
                          >
                            {regionsList.map((reg) => (
                              <option key={reg} value={reg}>
                                {reg}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Category Selector */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                            <School size={12} />
                            학교 급별
                          </label>
                          <select
                            id="select-level-center"
                            value={filterLevel}
                            onChange={(e) => setFilterLevel(e.target.value)}
                            className="w-full text-sm bg-slate-50 border border-slate-100 text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium cursor-pointer"
                          >
                            <option value="전체">전체 학급</option>
                            <option value="초등학교">초등학교</option>
                            <option value="중학교">중학교</option>
                            <option value="고등학교">고등학교</option>
                            <option value="기타">기타 / 특수학급</option>
                          </select>
                        </div>
                      </div>

                      {/* Public/Private type selector */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                          <Building2 size={12} />
                          설립 구분
                        </label>
                        <div className="flex gap-2">
                          {["전체", "공립", "사립", "국립"].map((type) => (
                            <button
                              id={`btn-type-center-${type}`}
                              key={type}
                              type="button"
                              onClick={() => setFilterType(type)}
                              className={`flex-1 max-w-[80px] py-1 rounded-xl text-xs font-semibold border transition-all ${
                                filterType === type
                                  ? "bg-blue-50 border-blue-200 text-blue-700"
                                  : "bg-white hover:bg-slate-50 border-slate-100 text-slate-500"
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* RECENT SEARCH TERMS OR POPULAR RECOMMENDATIONS */}
              <div id="recent-search-section" className="mt-8 max-w-2xl mx-auto w-full text-center">
                {recentSearches.length > 0 ? (
                  <div className="inline-flex flex-wrap items-center justify-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
                      <Clock size={12} />
                      최근 검색어:
                    </span>
                    {recentSearches.map((term, idx) => (
                      <span
                        id={`recent-${idx}`}
                        key={term}
                        onClick={() => {
                          setSearchTerm(term);
                          handleSearch(term);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 text-slate-600 hover:text-blue-600 hover:border-blue-100 hover:shadow-sm text-xs font-medium rounded-full cursor-pointer transition-all"
                      >
                        {term}
                        <button
                          id={`btn-delete-recent-${idx}`}
                          onClick={(e) => removeRecentSearch(term, e)}
                          className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                        >
                          <X size={10} strokeWidth={2.5} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
                      <Sparkles size={12} className="text-blue-500" />
                      추천 키워드:
                    </span>
                    {["과학고", "외고", "예술고", "마이스터", "특수학교"].map((k) => (
                      <button
                        id={`btn-recommend-${k}`}
                        key={k}
                        onClick={() => {
                          setSearchTerm(k);
                          handleSearch(k);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/60 border border-slate-200/20 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-full transition-all cursor-pointer"
                      >
                        #{k}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            
            /* 2. RESULTS VIEW (Primary Interactive Search Panel) */
            <motion.div
              id="active-results-view"
              key="results-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-grow flex flex-col"
              ref={resultsRef}
            >
              
              {/* COMPACT TOP SEARCH & FILTER RIBBON */}
              <section id="results-search-ribbon" className="bg-white border-b border-slate-200/60 shadow-sm transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                  
                  {/* Inline Search Bar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSearch();
                    }}
                    className="w-full md:max-w-md flex items-center gap-2"
                  >
                    <div className="relative flex-grow flex items-center">
                      <Search className="absolute left-3.5 text-slate-400" size={16} />
                      <input
                        id="input-school-name-top"
                        type="text"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 transition-all shadow-inner"
                        placeholder="새로운 학교명 입력..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <button
                          id="btn-clear-top"
                          type="button"
                          onClick={() => setSearchTerm("")}
                          className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <button
                      id="btn-search-top"
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl cursor-pointer shadow-md shadow-blue-600/10 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Search size={16} />
                      )}
                      <span>검색</span>
                    </button>
                  </form>

                  {/* Dynamic Multi-Filters Inline Bar */}
                  <div id="results-inline-filters" className="w-full md:w-auto flex flex-wrap items-center gap-2.5">
                    
                    {/* Region Select */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-400 whitespace-nowrap">지역</span>
                      <select
                        id="select-region-top"
                        value={filterRegion}
                        onChange={(e) => setFilterRegion(e.target.value)}
                        className="text-xs bg-slate-100 hover:bg-slate-200/70 text-slate-700 font-medium px-2.5 py-2 rounded-xl focus:outline-none outline-none cursor-pointer tracking-tight"
                      >
                        {regionsList.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Level Select */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-400 whitespace-nowrap">급별</span>
                      <select
                        id="select-level-top"
                        value={filterLevel}
                        onChange={(e) => setFilterLevel(e.target.value)}
                        className="text-xs bg-slate-100 hover:bg-slate-200/70 text-slate-700 font-medium px-2.5 py-2 rounded-xl focus:outline-none outline-none cursor-pointer tracking-tight"
                      >
                        <option value="전체">전체 학급</option>
                        <option value="초등학교">초등</option>
                        <option value="중학교">중학</option>
                        <option value="고등학교">고등</option>
                        <option value="기타">기타</option>
                      </select>
                    </div>

                    {/* Type Filters Button Pills */}
                    <div className="flex items-center gap-1 border-l border-slate-200 pl-2.5">
                      {["전체", "공립", "사립", "국립"].map((type) => (
                        <button
                          id={`btn-type-top-${type}`}
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            filterType === type
                              ? "bg-blue-50 border border-blue-200/60 text-blue-700"
                              : "bg-slate-50 border border-transparent text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                  </div>
                </div>
              </section>

              {/* SEARCH META & MULTI-VIEW LAYOUT */}
              <div id="results-layout-grid-container" className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 2A. LEFT COLUMN: School card listing */}
                <div id="school-results-left-col" className="lg:col-span-7 flex flex-col min-h-[50vh]">
                  
                  {/* Results Count & Badges */}
                  <div id="results-info-header" className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-500 tracking-tight flex items-center gap-1.5">
                        {showBookmarksOnly ? (
                          <>
                            <BookmarkCheck size={16} className="text-blue-600 fill-blue-600/10" />
                            <span>관심 학교 목록</span>
                          </>
                        ) : (
                          <>
                            <Building2 size={16} className="text-slate-400" />
                            <span>학교 검색 결과</span>
                          </>
                        )}
                      </h3>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100/50">
                        {filteredSchools.length}건
                      </span>
                    </div>

                    {/* Quick clear active filters */}
                    {(filterRegion !== "전체" || filterLevel !== "전체" || filterType !== "전체") && (
                      <button
                        id="btn-clear-filters"
                        onClick={() => {
                          setFilterRegion("전체");
                          setFilterLevel("전체");
                          setFilterType("전체");
                          addToast("모든 필터 조건이 초기화되었습니다.", "info");
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 underline decoration-dotted underline-offset-4"
                      >
                        필터 해제
                      </button>
                    )}
                  </div>

                  {/* LOADING STATE CARD GRID */}
                  {loading ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
                      <Loader2 className="animate-spin text-blue-600 mb-3" size={36} />
                      <p className="text-sm font-semibold text-slate-500">
                        전국 교육기관망에서 실시간 조회 처리 중...
                      </p>
                    </div>
                  ) : error && filteredSchools.length === 0 && !showBookmarksOnly ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
                      <X className="text-rose-500 mb-3" size={32} />
                      <p className="text-sm font-bold text-slate-700 mb-1">
                        학교를 검색할 수 없습니다.
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-[300px] text-center">
                        철자가 정확한지 확인 후 지역 및 급별 분류를 다르게 설정하여 다시 조회해주세요. (예: &lsquo;명동&rsquo; 대신 &lsquo;명동초&rsquo;)
                      </p>
                    </div>
                  ) : filteredSchools.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
                      <Building2 className="text-slate-300 mb-3" size={36} />
                      <p className="text-sm font-bold text-slate-500 text-center">
                        {showBookmarksOnly 
                          ? "저장된 관심 학교 목록이 비어있습니다." 
                          : "선택한 조건에 부합하는 학교가 없습니다."}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {showBookmarksOnly ? "학교를 검색한 뒤 카드 우측의 북마크 아이콘을 클릭하여 관심 학교를 지정해보세요." : "상단의 필터 조건을 변경해 주십시오."}
                      </p>
                    </div>
                  ) : (
                    
                    /* THE LIST OF CARDS WITH ENTRY TRANSITIONS */
                    <div id="cards-container-grid" className="space-y-3 flex-grow overflow-y-auto max-h-[75vh] pr-1 scrollbar-thin">
                      {filteredSchools.map((school, index) => {
                        const isSelected = selectedSchool?.SD_SCHUL_CODE === school.SD_SCHUL_CODE;
                        const isBookmarked = savedSchools.some((s) => s.SD_SCHUL_CODE === school.SD_SCHUL_CODE);

                        return (
                          <motion.div
                            id={`school-card-${school.SD_SCHUL_CODE}`}
                            key={school.SD_SCHUL_CODE}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.3) }}
                            onClick={() => setSelectedSchool(school)}
                            className={`p-4 sm:p-5 rounded-2xl bg-white border cursor-pointer select-none relative transition-all duration-250 hover:shadow-md hover:-translate-y-0.5 ${
                              isSelected
                                ? "border-blue-600 shadow-md shadow-blue-600/5 ring-1 ring-blue-600 bg-blue-50/10"
                                : "border-slate-200/70 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex gap-3 items-start justify-between">
                              <div className="flex-1 min-w-0">
                                
                                {/* Badge and Office */}
                                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                  <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-md uppercase tracking-wider ${getSchoolLevelBadgeColor(school.SCHUL_KND_SC_NM)}`}>
                                    {school.SCHUL_KND_SC_NM}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-400/80 bg-slate-50 border border-slate-100 rounded-md px-1.5 py-0.5 text-center">
                                    {school.ATPT_OFCDC_SC_NM}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-400 border border-slate-100 bg-slate-50 px-1.5 py-0.5 rounded-md">
                                    {school.FOND_SC_NM}
                                  </span>
                                </div>

                                {/* School name */}
                                <h4 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                                  {school.SCHUL_NM}
                                  {school.COEDU_SC_NM && (
                                    <span className="text-xs font-medium text-slate-400/80">
                                      ({school.COEDU_SC_NM})
                                    </span>
                                  )}
                                </h4>

                                {/* School Address text */}
                                <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed flex items-start gap-1">
                                  <MapPin size={14} className="mt-0.5 text-slate-400 shrink-0" />
                                  <span className="break-all">{school.ORG_RDNMA || "도로명주소 정보 없음"}</span>
                                </p>
                              </div>

                              {/* Action Items on Card Side */}
                              <div className="flex flex-col items-end gap-3 self-stretch justify-between">
                                {/* Bookmark icon */}
                                <button
                                  id={`btn-bookmark-card-${school.SD_SCHUL_CODE}`}
                                  type="button"
                                  onClick={(e) => toggleBookmark(school, e)}
                                  className={`p-2 rounded-xl border transition-all ${
                                    isBookmarked
                                      ? "bg-blue-50 border-blue-200 text-blue-600 scale-105 shadow-sm"
                                      : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                  }`}
                                  title={isBookmarked ? "관심 학교 등록 해제" : "관심 학교 등록"}
                                >
                                  <Bookmark size={15} className={isBookmarked ? "fill-blue-600 text-blue-600" : ""} />
                                </button>

                                {/* Mini Chevron */}
                                <div className={`p-1.5 rounded-lg transition-transform ${isSelected ? "text-blue-600 translate-x-0.5" : "text-slate-300"}`}>
                                  <ChevronRight size={18} />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2B. RIGHT COLUMN: Detailed School profile panel */}
                <div id="school-profile-right-col" className="lg:col-span-5 flex flex-col">
                  <AnimatePresence mode="wait">
                    {selectedSchool ? (
                      <motion.div
                        id={`profile-card-${selectedSchool.SD_SCHUL_CODE}`}
                        key={selectedSchool.SD_SCHUL_CODE}
                        initial={{ opacity: 0, scale: 0.98, x: 10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-3xl border border-blue-100 shadow-md p-6 flex flex-col gap-6 sticky top-24"
                      >
                        {/* Profile Header */}
                        <div>
                          <div className="flex items-center justify-between mb-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${getSchoolLevelBadgeColor(selectedSchool.SCHUL_KND_SC_NM)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${getSchoolLevelAccentColor(selectedSchool.SCHUL_KND_SC_NM)}`}></span>
                              {selectedSchool.SCHUL_KND_SC_NM}
                            </span>

                            {/* Bookmark Action */}
                            <button
                              id={`btn-bookmark-profile-${selectedSchool.SD_SCHUL_CODE}`}
                              onClick={() => toggleBookmark(selectedSchool)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                                savedSchools.some((s) => s.SD_SCHUL_CODE === selectedSchool.SD_SCHUL_CODE)
                                  ? "bg-blue-50 border-blue-200 text-blue-700"
                                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                              }`}
                            >
                              <Bookmark
                                size={12}
                                className={
                                  savedSchools.some((s) => s.SD_SCHUL_CODE === selectedSchool.SD_SCHUL_CODE)
                                    ? "fill-blue-600 text-blue-700"
                                    : ""
                                }
                              />
                              <span>
                                {savedSchools.some((s) => s.SD_SCHUL_CODE === selectedSchool.SD_SCHUL_CODE)
                                  ? "등록됨"
                                  : "관심 등록"}
                              </span>
                            </button>
                          </div>

                          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                            {selectedSchool.SCHUL_NM}
                          </h2>
                          {selectedSchool.ENG_SCHUL_NM && (
                            <p className="text-xs text-slate-400 font-medium tracking-tight mt-1 truncate">
                              {selectedSchool.ENG_SCHUL_NM}
                            </p>
                          )}
                        </div>

                        {/* Quick Facts Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-slate-50 border border-slate-100/50 rounded-2xl flex flex-col justify-between">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400">설립 형태</span>
                            <span className="text-sm sm:text-base font-extrabold text-slate-800 mt-1">
                              {selectedSchool.FOND_SC_NM || "정보 없음"} ({selectedSchool.COEDU_SC_NM || "남녀구분 무"})
                            </span>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-100/50 rounded-2xl flex flex-col justify-between">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400">공식 설립일</span>
                            <span className="text-sm sm:text-base font-extrabold text-slate-800 mt-1">
                              {formatYMD(selectedSchool.FOND_YMD)}
                            </span>
                          </div>
                        </div>

                        {/* Detailed Specs list */}
                        <div className="space-y-3.5 pt-3.5 border-t border-slate-100">
                          
                          {/* Office */}
                          <div className="flex items-start gap-3">
                            <Building2 className="text-slate-400 shrink-0 mt-0.5" size={16} />
                            <div>
                              <p className="text-xs text-slate-400 font-bold">소속 교육청</p>
                              <p className="text-sm font-semibold text-slate-700 mt-0.5">
                                {selectedSchool.ATPT_OFCDC_SC_NM}
                              </p>
                              {selectedSchool.JU_ORG_NM !== selectedSchool.ATPT_OFCDC_SC_NM && (
                                <p className="text-xs text-slate-400 font-medium mt-0.2">
                                  {selectedSchool.JU_ORG_NM}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Address with copy */}
                          <div className="flex items-start gap-3">
                            <MapPin className="text-slate-400 shrink-0 mt-0.5" size={16} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-400 font-bold flex items-center justify-between">
                                <span>학교 소재 주소</span>
                                <button
                                  id="btn-copy-address"
                                  onClick={() => copyToClipboard(selectedSchool.ORG_RDNMA, "학교 도로명 주소")}
                                  className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5"
                                >
                                  <Copy size={10} />
                                  <span>복사</span>
                                </button>
                              </p>
                              <p className="text-sm font-semibold text-slate-700 mt-0.5 leading-relaxed break-words">
                                {selectedSchool.ORG_RDNMA}
                              </p>
                              {selectedSchool.ORG_RDNZC && (
                                <p className="text-xs font-mono text-slate-400 mt-0.5">
                                  우편번호: {selectedSchool.ORG_RDNZC}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Phone Call (Safe rendering) */}
                          <div className="flex items-start gap-3">
                            <Phone className="text-slate-400 shrink-0 mt-0.5" size={16} />
                            <div>
                              <p className="text-xs text-slate-400 font-bold">행정실 연락처</p>
                              {selectedSchool.ORG_TELNO ? (
                                <a
                                  id="link-tel"
                                  href={`tel:${selectedSchool.ORG_TELNO}`}
                                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline mt-0.5 block font-mono"
                                >
                                  {selectedSchool.ORG_TELNO}
                                </a>
                              ) : (
                                <p className="text-sm font-semibold text-slate-400 mt-0.5">전화번호 미등록</p>
                              )}
                            </div>
                          </div>

                          {/* Official Website */}
                          <div className="flex items-start gap-3">
                            <Globe className="text-slate-400 shrink-0 mt-0.5" size={16} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-400 font-bold">공식 홈페이지</p>
                              {selectedSchool.HMPG_ADRES && selectedSchool.HMPG_ADRES !== "null" ? (
                                <a
                                  id="link-homepage"
                                  href={
                                    selectedSchool.HMPG_ADRES.startsWith("http")
                                      ? selectedSchool.HMPG_ADRES
                                      : `http://${selectedSchool.HMPG_ADRES}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 mt-0.5 block truncate hover:underline flex items-center gap-1"
                                >
                                  <span className="truncate">{selectedSchool.HMPG_ADRES}</span>
                                  <ExternalLink size={12} className="shrink-0" />
                                </a>
                              ) : (
                                <p className="text-sm font-semibold text-slate-400 mt-0.5">공식 사이트 정보 없음</p>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Portal Maps & Share integration triggers */}
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-4 border-t border-slate-100">
                          <a
                            id="link-naver-map"
                            href={`https://map.naver.com/v5/search/${encodeURIComponent(selectedSchool.SCHUL_NM)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 px-3 py-3 bg-[#03C75A] hover:bg-[#02b14f] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                          >
                            <span>네이버 지도 검색</span>
                            <ExternalLink size={12} />
                          </a>
                          <a
                            id="link-kakao-map"
                            href={`https://map.kakao.com/?q=${encodeURIComponent(selectedSchool.SCHUL_NM)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 px-3 py-3 bg-[#FEE500] hover:bg-[#eacb00] text-amber-950 rounded-xl text-xs font-bold transition-all shadow-sm"
                          >
                            <span>카카오 맵 검색</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="h-full bg-slate-50 border border-slate-200/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center text-slate-400 min-h-[300px]">
                        <Info size={32} className="text-slate-300 mb-3" />
                        <h4 className="font-bold text-slate-600 text-sm">학교 상세 정보</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                          왼쪽 목록에서 학교 카드를 클릭하여 해당 학교의 상세 정보 및 홈피, 포털지도 바로가기 등을 확인하세요.
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer id="app-footer" className="bg-white border-t border-slate-100/80 text-center py-6 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 space-y-1.5">
          <p className="font-medium">
            전국 학교 스마트 내비게이터 © {new Date().getFullYear()}. 데이터 제공: 교육부 NEIS 공공데이터 개방 서비스
          </p>
          <p className="text-[10px] text-slate-300">
            Open API 인증키: {NEIS_API_KEY.substring(0, 8)}... (설정 상태 정상)
          </p>
        </div>
      </footer>
    </div>
  );
}
