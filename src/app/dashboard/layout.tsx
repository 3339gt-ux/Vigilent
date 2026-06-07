'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  FolderLock,
  Grid,
  ClipboardList,
  FolderArchive,
  Settings,
  CreditCard,
  Building2,
  LogOut,
  Sun,
  Moon,
  CircleDot,
  Info,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff,
  UserCheck,
  UploadCloud,
  History,
  Star,
  BarChart3
} from 'lucide-react';
import { BulkUploadConfigurationPanel } from '@/components/BulkUploadConfigurationPanel';
import { NotificationBell } from '@/components/NotificationBell';

function AppearanceControls({ compact = false }: { compact?: boolean }) {
  const { themePreference, setThemePreference } = useApp();
  const options = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'midtone' as const, label: 'Midtone', icon: CircleDot },
    { value: 'dark' as const, label: 'Dark', icon: Moon }
  ];

  return (
    <div className={`grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/40 p-1 ${compact ? 'w-full' : ''}`} aria-label="Appearance">
      {options.map(option => {
        const Icon = option.icon;
        const selected = themePreference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setThemePreference(option.value)}
            aria-label={`Use ${option.label} appearance`}
            aria-pressed={selected}
            title={option.label}
            className={`flex min-w-0 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
              compact ? 'h-8 px-1' : 'gap-1.5 px-2 py-1.5 text-[10px] font-bold'
            } ${selected ? 'bg-indigo-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-card hover:text-foreground'}`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {!compact && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, organization, logout, theme, isLoading, isAuthenticated } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [sidebarPinned, setSidebarPinned] = React.useState(false);

  const {
    frameworkRequirements,
    requirementEvidenceCriteria,
    actions,
    competencyRecords,
    people,
    competencyTypes,
    uploadDocument,
    updateDocumentMetadata,
    linkDocumentToRequirement,
    linkDocumentToEvidenceCriterion,
    linkDocumentToAction,
    linkDocumentToCompetencyRecord
  } = useApp();

  const [isGlobalDragging, setIsGlobalDragging] = React.useState(false);
  const [globalUploading, setGlobalUploading] = React.useState(false);
  const [globalUploadQueue, setGlobalUploadQueue] = React.useState<any[]>([]);
  const [bulkDocs, setBulkDocs] = React.useState<any[]>([]);
  const dragCounterRef = React.useRef(0);
  const sidebarStorageKey = user && organization
    ? `vygilence_sidebar_state_${user.id}_${organization.id}`
    : null;

  React.useEffect(() => {
    if (!sidebarStorageKey) return;
    try {
      const stored = localStorage.getItem(sidebarStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as { collapsed?: unknown; pinned?: unknown };
        setSidebarCollapsed(typeof parsed.collapsed === 'boolean' ? parsed.collapsed : window.innerWidth < 1280);
        setSidebarPinned(typeof parsed.pinned === 'boolean' ? parsed.pinned : false);
      } else {
        setSidebarCollapsed(window.innerWidth < 1280);
        setSidebarPinned(false);
      }
    } catch (error) {
      console.warn('Unable to load sidebar preference.', error);
      setSidebarCollapsed(window.innerWidth < 1280);
      setSidebarPinned(false);
    }
  }, [sidebarStorageKey]);

  React.useEffect(() => {
    if (sidebarPinned) return;
    const applyResponsiveDefault = () => setSidebarCollapsed(window.innerWidth < 1280);
    window.addEventListener('resize', applyResponsiveDefault);
    return () => window.removeEventListener('resize', applyResponsiveDefault);
  }, [sidebarPinned]);

  const persistSidebarState = (collapsed: boolean, pinned: boolean) => {
    if (!sidebarStorageKey) return;
    try {
      localStorage.setItem(sidebarStorageKey, JSON.stringify({ collapsed, pinned }));
    } catch (error) {
      console.warn('Unable to persist sidebar preference.', error);
    }
  };

  const toggleSidebarCollapsed = () => {
    const nextCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(nextCollapsed);
    persistSidebarState(nextCollapsed, sidebarPinned);
  };

  const toggleSidebarPinned = () => {
    const nextPinned = !sidebarPinned;
    setSidebarPinned(nextPinned);
    persistSidebarState(sidebarCollapsed, nextPinned);
  };

  // Determine context from pathname
  const uploadContext = React.useMemo(() => {
    if (pathname.includes('/competencies')) return 'competency';
    if (pathname.includes('/requirements')) return 'requirement';
    if (pathname.includes('/vault')) return 'vault';
    return 'vault';
  }, [pathname]);

  const handleGlobalUpload = async (files: File[]) => {
    setGlobalUploading(true);
    const nextQueue = files.map(file => ({
      id: `global-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fileName: file.name,
      fileSize: file.size,
      status: 'uploading'
    }));
    setGlobalUploadQueue(nextQueue);

    const uploadedDocs: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const queueItem = nextQueue[i];
      try {
        const doc = await uploadDocument({
          file,
          title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim() || file.name,
          category: uploadContext === 'competency' ? 'Training & Competency' :
                    uploadContext === 'requirement' ? 'Requirement Evidence' :
                    'General',
          expiry_date: null,
          issue_date: new Date().toISOString().split('T')[0],
          metadata: { source: 'global_drag_drop' },
          tags: []
        });
        uploadedDocs.push(doc);
        setGlobalUploadQueue(current => current.map(item => item.id === queueItem.id ? { ...item, status: 'complete' } : item));
      } catch (err) {
        setGlobalUploadQueue(current => current.map(item => item.id === queueItem.id ? { ...item, status: 'failed', error: err instanceof Error ? err.message : 'Failed' } : item));
      }
    }

    if (uploadedDocs.length > 0) {
      setBulkDocs(uploadedDocs);
    }
    setGlobalUploading(false);

    // Clear queue indicator after 3 seconds
    setTimeout(() => {
      setGlobalUploadQueue([]);
    }, 3000);
  };

  React.useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        dragCounterRef.current += 1;
        if (dragCounterRef.current === 1) {
          setIsGlobalDragging(true);
        }
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        dragCounterRef.current -= 1;
        if (dragCounterRef.current <= 0) {
          dragCounterRef.current = 0;
          setIsGlobalDragging(false);
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = async (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        dragCounterRef.current = 0;
        setIsGlobalDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
          await handleGlobalUpload(files);
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [uploadContext]);

  // Authentication gate
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!organization) {
      router.push('/onboarding');
    }
  }, [isAuthenticated, organization, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 flex items-center justify-center animate-pulse">
          <Image src="/brand/vygilence-mark.png" alt="Vygilence Logo" width={32} height={32} className="object-contain" />
        </div>
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Checking credentials & workspace config...</p>
      </div>
    );
  }

  if (!user || !organization) {
    return null; // gating
  }

  const isOwnerOrAdmin = user?.role === 'Owner' || user?.role === 'Admin';

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Favourites', href: '/dashboard/favourites', icon: Star },
    { name: 'Requirements', href: '/dashboard/requirements', icon: ClipboardList },
    { name: 'Competency Matrix', href: '/dashboard/competencies', icon: UserCheck },
    { name: 'Evidence Vault', href: '/dashboard/vault', icon: FolderLock },
    { name: 'Evidence Matrix', href: '/dashboard/matrix', icon: Grid },
    { name: 'Audit Pack Builder', href: '/dashboard/audit-packs', icon: FolderArchive },
    { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
    ...(isOwnerOrAdmin ? [{ name: 'Audit Trail', href: '/dashboard/audit-trail', icon: History }] : []),
    { name: 'Organisation Management', href: '/dashboard/organisation', icon: Building2 },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">

      {/* 1. Regulatory Warning Banner at the Top */}
      <div className="w-full bg-amber-500/10 dark:bg-amber-950/20 border-b border-amber-500/25 py-2 px-4 flex items-center justify-center gap-2 print:hidden">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-[11px] md:text-xs text-muted-foreground text-center leading-normal">
          <strong>Notice:</strong> Vygilence is an evidence repository. It <strong>does not</strong> generate legal advice, build safety templates, or certify regulatory compliance.
        </span>
      </div>

      <div className="flex flex-1 relative">
        {/* 2. Desktop Sidebar */}
        <aside className={`hidden lg:flex flex-col overflow-hidden bg-card border-r border-border/80 sticky top-0 h-[calc(100vh-37px)] justify-between shrink-0 transition-[width,padding] duration-200 print:hidden ${
          sidebarCollapsed ? 'w-20 p-3' : 'w-64 p-6'
        }`}>
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Logo */}
            <div className={`flex ${sidebarCollapsed ? 'flex-col gap-2' : 'items-start justify-between gap-3'}`}>
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 min-w-0'}`}>
                <div className="w-9 h-9 flex items-center justify-center shrink-0">
                  <Image
                    src={theme === 'light' ? '/brand/vygilence-mark-light.png' : '/brand/vygilence-mark.png'}
                    alt="Vygilence Logo"
                    width={36}
                    height={36}
                    className="object-contain"
                  />
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <span className="font-extrabold tracking-tight text-sm block">Vygilence</span>
                    <span className="text-[10px] text-muted-foreground block truncate">{organization.name}</span>
                  </div>
                )}
              </div>
              <div className={`flex ${sidebarCollapsed ? 'w-full justify-center gap-1' : 'gap-1'}`}>
                <button
                  type="button"
                  onClick={toggleSidebarPinned}
                  aria-label={sidebarPinned ? 'Unpin sidebar state' : 'Pin sidebar state'}
                  aria-pressed={sidebarPinned}
                  title={sidebarPinned ? 'Unpin sidebar state' : 'Pin sidebar state'}
                  className={`p-1.5 rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                    sidebarPinned ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500' : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {sidebarPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={toggleSidebarCollapsed}
                  aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  className="p-1.5 rounded-md border border-border bg-muted/40 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500"
                >
                  {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Menu Links */}
            <nav className={`min-h-0 flex-1 overflow-y-auto pr-1 space-y-1.5 ${sidebarCollapsed ? 'mt-5' : 'mt-8'}`}>
              {menuItems.map(item => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    id={`sidebar-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    aria-label={item.name}
                    aria-current={isActive ? 'page' : undefined}
                    title={sidebarCollapsed ? item.name : undefined}
                    className={`group relative flex items-center rounded-lg text-xs font-semibold tracking-wide transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                      sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                    {sidebarCollapsed && (
                      <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1.5 text-[10px] font-bold text-popover-foreground shadow-lg group-hover:block group-focus-visible:block">
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer Actions */}
          <div className={`shrink-0 pt-4 border-t border-border/60 ${sidebarCollapsed ? 'space-y-3' : 'space-y-4'}`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-2 py-1'}`} title={sidebarCollapsed ? `${user.full_name}, ${user.role}` : undefined}>
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0">
                {user.full_name.charAt(0)}
              </div>
              {!sidebarCollapsed && <div className="overflow-hidden">
                <span className="text-xs font-bold block truncate">{user.full_name}</span>
                <span className="text-[10px] text-muted-foreground block truncate">{user.role}</span>
              </div>}
            </div>

            <AppearanceControls compact={sidebarCollapsed} />

            <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'flex-col' : 'justify-between'}`}>
              <NotificationBell dropdownAlign={sidebarCollapsed ? 'left-full bottom-0 ml-3' : 'left-0 bottom-full mb-2'} />
              <button
                onClick={async () => {
                  await logout();
                  router.push('/');
                }}
                aria-label="Sign out"
                title={sidebarCollapsed ? 'Sign out' : undefined}
                className={`flex items-center justify-center rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors ${
                  sidebarCollapsed ? 'p-2' : 'gap-2 flex-grow px-3 py-2'
                }`}
                id="sidebar-logout-btn"
              >
                <LogOut className="w-4 h-4" />
                {!sidebarCollapsed && 'Sign Out'}
              </button>
            </div>
          </div>
        </aside>

        {/* 3. Mobile Header & Menu */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="lg:hidden h-14 bg-card border-b border-border/80 px-4 flex items-center justify-between z-40 print:hidden">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center">
                <Image
                  src={theme === 'light' ? '/brand/vygilence-mark-light.png' : '/brand/vygilence-mark.png'}
                  alt="Vygilence Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <span className="font-extrabold text-xs">{organization.name}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <NotificationBell dropdownAlign="right-0 top-full mt-2" />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Toggle menu"
                id="mobile-menu-toggle"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </header>

          {/* Mobile Dropdown Panel */}
          {mobileMenuOpen && (
            <div className="lg:hidden absolute top-14 left-0 right-0 bg-card border-b border-border shadow-lg z-30 p-4 space-y-4 print:hidden">
              <nav className="flex flex-col gap-1">
                {menuItems.map(item => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-border flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs">
                    {user.full_name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{user.full_name}</span>
                    <span className="text-[10px] text-muted-foreground block">{user.role}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <AppearanceControls />
                  <button
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await logout();
                      router.push('/');
                    }}
                    className="p-2 rounded-lg bg-rose-500/10 text-rose-600 text-xs font-bold"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. Active Page Content */}
          <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>

      {bulkDocs.length > 0 && (
        <BulkUploadConfigurationPanel
          documents={bulkDocs}
          requirements={frameworkRequirements}
          criteria={requirementEvidenceCriteria}
          actions={actions}
          competencyRecords={competencyRecords}
          people={people}
          competencyTypes={competencyTypes}
          uploadContext={uploadContext}
          onClose={() => setBulkDocs([])}
          onUpdateDocument={updateDocumentMetadata}
          onLinkRequirement={linkDocumentToRequirement}
          onLinkCriterion={linkDocumentToEvidenceCriterion}
          onLinkAction={linkDocumentToAction}
          onLinkCompetencyRecord={linkDocumentToCompetencyRecord}
        />
      )}

      {/* Global Drag Overlay */}
      {isGlobalDragging && (
        <div className="fixed inset-0 z-[99] bg-indigo-950/20 dark:bg-black/60 flex items-center justify-center p-6 pointer-events-none">
          <div className="max-w-md w-full bg-card dark:bg-zinc-900 border-2 border-dashed border-indigo-500 rounded-2xl p-8 text-center space-y-4 shadow-2xl animate-pulse">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto text-indigo-650 dark:text-indigo-400">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-indigo-950 dark:text-indigo-50">Drop evidence files here</h3>
              <p className="text-xs text-muted-foreground">
                Release files to start uploading securely to Vygilence
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Global Upload Queue Progress Toast */}
      {globalUploadQueue.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[100] bg-card border border-border shadow-2xl rounded-2xl p-4 w-80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Uploading files...</span>
            <span className="text-[10px] text-muted-foreground">
              {globalUploadQueue.filter(q => q.status === 'complete').length} / {globalUploadQueue.length} done
            </span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {globalUploadQueue.map(item => (
              <div key={item.id} className="text-xs flex items-center justify-between gap-2 p-2 bg-muted/40 rounded-xl">
                <span className="truncate font-medium flex-1 text-[11px] text-foreground">{item.fileName}</span>
                <span className={`text-[10px] font-bold ${
                  item.status === 'complete' ? 'text-emerald-600 dark:text-emerald-400' :
                  item.status === 'failed' ? 'text-rose-600 dark:text-rose-400' :
                  'text-indigo-600 dark:text-indigo-400'
                }`}>
                  {item.status === 'complete' ? 'Ready' : item.status === 'failed' ? 'Failed' : 'Uploading...'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
