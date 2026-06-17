'use client';

import React, { useState } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  FolderArchive,
  Info,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  User,
  Package,
  FileText,
  Activity,
  Folder,
  Eye,
  Settings,
  ShieldAlert
} from 'lucide-react';
import { usePackBuilder, PackItem, PackItemType } from './EvidencePackBuilderProvider';

export function EvidencePackBuilderSidebar() {
  const {
    isOpen,
    isCollapsed,
    setIsCollapsed,
    setIsOpen,
    packName,
    setPackName,
    packDescription,
    setPackDescription,
    items,
    removeItem,
    clearPack,
    updateItemOptions,
    toggleItemIncluded
  } = usePackBuilder();

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  if (!isOpen) return null;

  const toggleItemExpand = (itemKey: string) => {
    setExpandedItems(prev => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  const getItemKey = (item: PackItem) => `${item.type}:${item.id}`;

  const getTypeIcon = (type: PackItemType) => {
    switch (type) {
      case 'requirement':
        return <ClipboardList className="w-3.5 h-3.5 text-indigo-650 dark:text-indigo-400" />;
      case 'person':
        return <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'asset':
        return <Package className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'evidence':
        return <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />;
      case 'action':
        return <Activity className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
    }
  };

  const getTypeLabel = (type: PackItemType) => {
    switch (type) {
      case 'requirement':
        return 'Requirement';
      case 'person':
        return 'Teammate';
      case 'asset':
        return 'Asset';
      case 'evidence':
        return 'Document';
      case 'action':
        return 'Action';
    }
  };

  // Group items by type
  const groupedItems = items.reduce<Record<PackItemType, PackItem[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {
    requirement: [],
    person: [],
    asset: [],
    evidence: [],
    action: []
  });

  const activeCount = items.length;
  const includedCount = items.filter(i => i.included).length;

  // Render Collapsed Strip
  if (isCollapsed) {
    return (
      <div
        onClick={() => setIsCollapsed(false)}
        className="w-12 bg-card border-l border-border hover:bg-muted/40 transition-all cursor-pointer flex flex-col items-center justify-between py-4 select-none shrink-0"
        title="Expand Evidence Pack Builder"
      >
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            className="p-1.5 hover:bg-muted rounded text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(false);
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="relative p-1 text-indigo-600 dark:text-indigo-400">
            <FolderArchive className="w-5 h-5" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[8px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </div>
        </div>
        <div className="h-0 w-0 border-t-[80px] border-t-muted-foreground/10 absolute top-1/2 -translate-y-1/2" />
        <span
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 select-none rotate-90 whitespace-nowrap my-20 origin-center"
        >
          Pack Builder
        </span>
        <button
          type="button"
          className="p-1 hover:bg-muted rounded text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Sidebar Panel */}
      <aside className="w-80 border-l border-border bg-card flex flex-col h-full shrink-0 select-none animate-in slide-in-from-right duration-250 z-30">
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10 shrink-0">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-indigo-650 dark:text-indigo-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Pack Builder</h3>
            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
              Draft
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
              title="Collapse sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
              title="Close pack builder"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Pack Details */}
          <div className="space-y-3 bg-muted/20 border border-border/60 p-3 rounded-xl">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Pack Name</label>
              <input
                type="text"
                value={packName}
                onChange={(e) => setPackName(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none text-foreground font-semibold placeholder-muted-foreground"
                placeholder="Enter pack name..."
              />
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Description</label>
              <textarea
                value={packDescription}
                onChange={(e) => setPackDescription(e.target.value)}
                rows={2}
                className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none text-foreground resize-none placeholder-muted-foreground leading-relaxed"
                placeholder="Describe this audit pack's purpose..."
              />
            </div>
          </div>

          {/* Grouped Items List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Draft Contents ({activeCount})</span>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearPack}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {activeCount === 0 ? (
              <div className="text-center p-8 border border-dashed border-border rounded-xl bg-muted/10">
                <Folder className="w-8 h-8 mx-auto text-muted-foreground/40 stroke-[1.5]" />
                <h4 className="text-xs font-bold text-foreground mt-2">Pack is empty</h4>
                <p className="text-[10px] text-muted-foreground mt-1 leading-normal max-w-[180px] mx-auto">
                  Navigate through LUMÉN and click "Add to pack" on any record, person, action, or document.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(Object.keys(groupedItems) as PackItemType[]).map((type) => {
                  const itemsOfType = groupedItems[type];
                  if (itemsOfType.length === 0) return null;

                  return (
                    <div key={type} className="space-y-1.5">
                      <h4 className="text-[9px] font-black uppercase tracking-wider text-muted-foreground pl-1">
                        {getTypeLabel(type)}s ({itemsOfType.length})
                      </h4>
                      <div className="space-y-1.5">
                        {itemsOfType.map((item) => {
                          const itemKey = getItemKey(item);
                          const isExpanded = !!expandedItems[itemKey];

                          return (
                            <div
                              key={item.id}
                              className={`border rounded-xl bg-card overflow-hidden transition-all ${
                                item.included ? 'border-border' : 'border-border/40 opacity-60'
                              }`}
                            >
                              {/* Item Summary Bar */}
                              <div className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/10 transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={item.included}
                                    onChange={() => toggleItemIncluded(item.id, item.type)}
                                    className="rounded border-border text-indigo-650 cursor-pointer h-3.5 w-3.5 shrink-0"
                                  />
                                  <span className="shrink-0">{getTypeIcon(item.type)}</span>
                                  <span className="text-[11px] font-bold text-foreground truncate max-w-[130px]" title={item.title}>
                                    {item.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleItemExpand(itemKey)}
                                    className="p-1 hover:bg-muted rounded text-muted-foreground"
                                  >
                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeItem(item.id, item.type)}
                                    className="p-1 hover:bg-rose-500/10 hover:text-rose-600 rounded text-muted-foreground transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Expanded Child Checklist */}
                              {isExpanded && (
                                <div className="border-t border-border bg-muted/10 p-2.5 space-y-2 text-[10px]">
                                  <span className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground block pl-0.5">
                                    Include Options
                                  </span>
                                  <div className="space-y-1.5 pl-0.5">
                                    {Object.keys(item.options).map((optKey) => {
                                      const isFileOption = optKey === 'includeFiles';
                                      return (
                                        <label
                                          key={optKey}
                                          className={`flex items-start gap-1.5 font-semibold leading-normal ${
                                            isFileOption
                                              ? 'text-muted-foreground cursor-not-allowed'
                                              : 'text-foreground cursor-pointer select-none'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={item.options[optKey]}
                                            disabled={isFileOption}
                                            onChange={() =>
                                              updateItemOptions(item.id, item.type, {
                                                [optKey]: !item.options[optKey]
                                              })
                                            }
                                            className="rounded border-border text-indigo-650 h-3 w-3 mt-0.5"
                                          />
                                          <div className="flex flex-col">
                                            <span>
                                              {optKey
                                                .replace('include', '')
                                                .replace(/([A-Z])/g, ' $1')
                                                .trim()}
                                            </span>
                                            {isFileOption && (
                                              <span className="text-[8px] text-amber-600 dark:text-amber-400 font-medium leading-tight mt-0.5 block">
                                                File export is deferred until ZIP/private file export review.
                                              </span>
                                            )}
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border space-y-2.5 bg-muted/10 shrink-0">
          <div className="text-[10px] text-muted-foreground flex justify-between px-1">
            <span>Included Items:</span>
            <span className="font-bold text-foreground">
              {includedCount} / {activeCount}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            disabled={includedCount === 0}
            className="w-full py-2 bg-muted hover:bg-muted/80 disabled:opacity-50 text-foreground border border-border font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview Pack Manifest
          </button>

          <button
            type="button"
            disabled
            className="w-full py-2 bg-indigo-600/50 text-white/50 border border-transparent rounded-lg text-xs font-bold flex flex-col items-center justify-center cursor-not-allowed leading-tight"
          >
            <span>Prepare ZIP export</span>
            <span className="text-[8px] text-white/30 font-medium">
              Deferred for Codex/security review
            </span>
          </button>
        </div>
      </aside>

      {/* Manifest Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-2xl h-[70vh] rounded-2xl flex flex-col relative shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/10">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Export Pack Structure Preview</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Virtual directory representation of the generated bundle manifest.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-border/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-800 dark:text-amber-300 flex items-start gap-2 shadow-xs">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                <div>
                  <span className="font-bold">Virtual Preview Only:</span> This pass previews the pack structure. Full ZIP export with private files is deferred for Codex/security review.
                </div>
              </div>

              {/* Directory Render Box */}
              <div className="bg-zinc-950 text-zinc-100 rounded-xl p-4 font-mono text-xs overflow-x-auto shadow-inner border border-zinc-800 leading-relaxed min-h-[200px]">
                <span className="text-indigo-400">📁 LUMEN-Audit-Pack-{packName.replace(/\s+/g, '-') || 'Draft'}/</span>
                <div className="pl-4 space-y-1">
                  <div>├── 📁 00-Pack-Index/</div>
                  <div className="pl-4 text-zinc-400">├── 📄 manifest.json <span className="text-zinc-500">(Contains included metadata indices)</span></div>
                  <div className="pl-4 text-zinc-400">└── 📄 index.html <span className="text-zinc-500">(Clean HTML index directory)</span></div>

                  {/* Requirements Group */}
                  {groupedItems.requirement.filter(i => i.included).length > 0 && (
                    <>
                      <div>├── 📁 01-Requirements/</div>
                      {groupedItems.requirement.filter(i => i.included).map(item => (
                        <div key={item.id} className="pl-4">
                          <div>├── 📁 {item.title.replace(/\s+/g, '-')}/</div>
                          <div className="pl-4 text-zinc-500">
                            {item.options.includeDetails && <div>├── 📄 requirement.json</div>}
                            {item.options.includeEvidence && <div>├── 📄 linked-evidence.json</div>}
                            {item.options.includeActions && <div>├── 📄 actions.json</div>}
                            {item.options.includeReviews && <div>└── 📄 reviews.json</div>}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Teammates Group */}
                  {groupedItems.person.filter(i => i.included).length > 0 && (
                    <>
                      <div>├── 📁 02-People/</div>
                      {groupedItems.person.filter(i => i.included).map(item => (
                        <div key={item.id} className="pl-4">
                          <div>├── 📁 {item.title.replace(/\s+/g, '-')}/</div>
                          <div className="pl-4 text-zinc-500">
                            {item.options.includeProfile && <div>├── 📄 profile.json</div>}
                            {item.options.includeCompetencies && <div>├── 📄 competencies.json</div>}
                            {item.options.includeActions && <div>└── 📄 actions.json</div>}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Assets Group */}
                  {groupedItems.asset.filter(i => i.included).length > 0 && (
                    <>
                      <div>├── 📁 03-Assets/</div>
                      {groupedItems.asset.filter(i => i.included).map(item => (
                        <div key={item.id} className="pl-4">
                          <div>├── 📁 {item.title.replace(/\s+/g, '-')}/</div>
                          <div className="pl-4 text-zinc-500">
                            {item.options.includeProfile && <div>├── 📄 profile.json</div>}
                            {item.options.includeChecks && <div>└── 📄 checks.json</div>}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Actions Group */}
                  {groupedItems.action.filter(i => i.included).length > 0 && (
                    <>
                      <div>├── 📁 04-Actions/</div>
                      {groupedItems.action.filter(i => i.included).map(item => (
                        <div key={item.id} className="pl-4">
                          <div>├── 📁 {item.title.replace(/\s+/g, '-')}/</div>
                          <div className="pl-4 text-zinc-500">
                            {item.options.includeDetails && <div>├── 📄 action.json</div>}
                            {item.options.includeNotes && <div>└── 📄 closure-notes.json</div>}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Evidence Group */}
                  {groupedItems.evidence.filter(i => i.included).length > 0 && (
                    <>
                      <div>├── 📁 05-Evidence-Metadata/</div>
                      {groupedItems.evidence.filter(i => i.included).map(item => (
                        <div key={item.id} className="pl-4">
                          <div>├── 📁 {item.title.replace(/\s+/g, '-')}/</div>
                          <div className="pl-4 text-zinc-500">
                            {item.options.includeMetadata && <div>├── 📄 metadata.json</div>}
                            {item.options.includeLinkedRecords && <div>└── 📄 linked-records.json</div>}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  <div>└── 📁 99-Export-Logs/</div>
                  <div className="pl-4 text-zinc-400">└── 📄 export-trail.json <span className="text-zinc-500">(Traceability logs)</span></div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex justify-end bg-muted/10 shrink-0">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
