'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { EvidenceDocument } from '@/lib/types';
import { evidenceAcceptAttribute, formatMaxEvidenceUploadSize } from '@/lib/evidenceStorage';
import { 
  FolderLock, 
  Search, 
  Filter, 
  Upload, 
  Eye, 
  Trash2, 
  Calendar, 
  X, 
  FileText, 
  Loader2,
  FileCheck,
  Plus,
} from 'lucide-react';

export default function EvidenceVault() {
  const { 
    documents, 
    frameworkRequirements,
    requirementDocuments,
    uploadDocument, 
    updateDocumentMetadata, 
    getDocumentSignedUrl,
    deleteDocument,
    linkDocumentToRequirement,
    unlinkDocumentFromRequirement
  } = useApp();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState<'title' | 'expiry' | 'uploaded'>('uploaded');

  // Upload dialog state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Vehicle');
  const [newFileName, setNewFileName] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newExpiry, setNewExpiry] = useState('');
  const [newIssue, setNewIssue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  
  // Side-drawer / Editing state
  const [selectedDoc, setSelectedDoc] = useState<EvidenceDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editIssue, setEditIssue] = useState('');
  const [editReview, setEditReview] = useState('');
  const [editTraining, setEditTraining] = useState('');
  const [editCalibration, setEditCalibration] = useState('');
  const [editTags, setEditTags] = useState('');
  const [metaKey, setMetaKey] = useState('');
  const [metaVal, setMetaVal] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [isOpeningFile, setIsOpeningFile] = useState(false);
  const [fileError, setFileError] = useState('');
  const [selectedRequirementId, setSelectedRequirementId] = useState('');

  // Heuristic metadata auto-suggester based on filename
  const handleFileNameChange = (val: string) => {
    setNewFileName(val);
    
    // 1. Guess category
    if (val.toLowerCase().includes('mot') || val.toLowerCase().includes('hgv') || val.toLowerCase().includes('truck') || val.toLowerCase().includes('van')) {
      setNewCategory('Vehicle');
    } else if (val.toLowerCase().includes('cpc') || val.toLowerCase().includes('driver') || val.toLowerCase().includes('license') || val.toLowerCase().includes('qualification')) {
      setNewCategory('Driver');
    } else if (val.toLowerCase().includes('fire') || val.toLowerCase().includes('warehouse') || val.toLowerCase().includes('loler') || val.toLowerCase().includes('lift')) {
      setNewCategory('Facility');
    } else if (val.toLowerCase().includes('insurance') || val.toLowerCase().includes('licence') || val.toLowerCase().includes('transit')) {
      setNewCategory('General');
    }

    // 2. Guess expiry date (e.g., if filename contains "2027-06-30" or "30-06-2027")
    const dateMatch = val.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
    if (dateMatch) {
      setNewExpiry(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
    } else {
      // Guess year check
      const yearMatch = val.match(/202[6-9]/);
      if (yearMatch) {
        setNewExpiry(`${yearMatch[0]}-12-31`); // Default to year end
      }
    }

    // Guess Title from filename if blank
    if (!newTitle) {
      const cleanName = val
        .replace(/\.[^/.]+$/, "") // strip extension
        .replace(/[-_]/g, " ") // replace dashes
        .replace(/\b\w/g, c => c.toUpperCase()); // title case
      setNewTitle(cleanName);
    }
  };

  const handleFileSelect = (file: File | null) => {
    setNewFile(file);
    setUploadError('');
    setUploadSuccess('');
    if (file) handleFileNameChange(file.name);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newFile) return;
    
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');
    try {
      await uploadDocument({
        file: newFile,
        title: newTitle,
        category: newCategory,
        expiry_date: newExpiry || null,
        issue_date: newIssue || null,
        metadata: {}
      });
      
      // Reset
      setNewTitle('');
      setNewCategory('Vehicle');
      setNewFileName('');
      setNewFile(null);
      setNewExpiry('');
      setNewIssue('');
      setUploadSuccess('Document uploaded to private storage.');
      setShowUploadModal(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectDoc = (doc: EvidenceDocument) => {
    setSelectedDoc(doc);
    setEditTitle(doc.title);
    setEditCategory(doc.category);
    setEditExpiry(doc.expiry_date || '');
    setEditIssue(doc.issue_date || '');
    setEditReview(doc.review_date || '');
    setEditTraining(doc.training_date || '');
    setEditCalibration(doc.calibration_date || '');
    setEditTags((doc.tags || []).join(', '));
    setMetaKey('');
    setMetaVal('');
    setFileError('');
    setSaveError('');
    setSaveSuccess('');
    setSelectedRequirementId('');
  };

  const handleLinkRequirement = async () => {
    if (!selectedDoc || !selectedRequirementId) return;
    setSaveError('');
    setSaveSuccess('');
    try {
      await linkDocumentToRequirement(selectedRequirementId, selectedDoc.id);
      setSelectedRequirementId('');
      setSaveSuccess('Evidence linked to requirement.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not link this evidence record.');
    }
  };

  const handleUnlinkRequirement = async (requirementId: string) => {
    if (!selectedDoc) return;
    setSaveError('');
    setSaveSuccess('');
    try {
      await unlinkDocumentFromRequirement(requirementId, selectedDoc.id);
      setSaveSuccess('Evidence link removed.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not remove this evidence link.');
    }
  };

  const handleSaveMetadata = async () => {
    if (!selectedDoc) return;
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const tags = editTags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);
      const updated = await updateDocumentMetadata(selectedDoc.id, {
        title: editTitle,
        category: editCategory,
        expiry_date: editExpiry || null,
        issue_date: editIssue || null,
        review_date: editReview || null,
        training_date: editTraining || null,
        calibration_date: editCalibration || null,
        tags
      });
      setSelectedDoc(updated);
      setSaveSuccess('Document metadata saved.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save document metadata.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPrivateFile = async () => {
    if (!selectedDoc) return;
    setIsOpeningFile(true);
    setFileError('');
    try {
      const signedUrl = await getDocumentSignedUrl(selectedDoc.id);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Could not open this file.');
    } finally {
      setIsOpeningFile(false);
    }
  };

  const handleAddMetaItem = async () => {
    if (!selectedDoc || !metaKey || !metaVal) return;
    setIsSaving(true);
    try {
      const updatedMeta = { ...selectedDoc.metadata, [metaKey]: metaVal };
      const updated = await updateDocumentMetadata(selectedDoc.id, {
        metadata: updatedMeta
      });
      setSelectedDoc(updated);
      setMetaKey('');
      setMetaVal('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMetaItem = async (keyToRemove: string) => {
    if (!selectedDoc) return;
    setIsSaving(true);
    try {
      const updatedMeta = { ...selectedDoc.metadata };
      delete updatedMeta[keyToRemove];
      const updated = await updateDocumentMetadata(selectedDoc.id, {
        metadata: updatedMeta
      });
      setSelectedDoc(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (confirm('Archive this evidence document? The private file remains stored, but the record will be hidden from normal views.')) {
      await deleteDocument(id);
      setSelectedDoc(null);
    }
  };

  // Filtered documents list
  const filteredDocs = documents
    .filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) || 
                            doc.file_name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
      const matchesStatus = selectedStatus === 'All' || doc.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'expiry') {
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
      }
      // default uploaded sorting (created_at descending)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="space-y-6">
      
      {/* Head section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" id="vault-heading">Evidence Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Secure tracking registry for compliance records, testing logs, and certificates.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/15"
          id="vault-open-upload-modal-btn"
        >
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 text-xs">
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Upload and Link Evidence</h2>
        <p className="text-muted-foreground mt-1 leading-relaxed">
          Upload a private evidence file, select it from the table, then use <strong className="text-foreground">Linked Requirements</strong> in the detail panel to connect the record to one or more requirements. Files open through temporary signed URLs only.
        </p>
      </div>

      {/* Grid: Search, Filters, and Table */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* Main vault browser list (2 cols) */}
        <div className="xl:col-span-2 space-y-4">
          
          {/* Controls Bar */}
          <div className="bg-card border border-border p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-xs">
              <Search className="w-4.5 h-4.5 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                id="vault-search"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search documents or files..."
                className="w-full pl-9 pr-4 py-2 bg-muted border border-border/80 rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              
              {/* Category selector */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="w-3.5 h-3.5" />
                <select
                  id="vault-filter-cat"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="bg-muted border border-border/80 rounded px-2 py-1 outline-none text-xs text-foreground font-semibold"
                >
                  <option value="All">All Categories</option>
                  <option value="Vehicle">Vehicle</option>
                  <option value="Driver">Driver</option>
                  <option value="Facility">Facility</option>
                  <option value="General">General</option>
                </select>
              </div>

              {/* Status filter */}
              <select
                id="vault-filter-status"
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="bg-muted border border-border/80 rounded px-2 py-1 outline-none text-xs text-foreground font-semibold"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Expired">Expired</option>
                <option value="Unclassified">Unclassified</option>
              </select>

              {/* Sort filter */}
              <select
                id="vault-sort-by"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'title' | 'expiry' | 'uploaded')}
                className="bg-muted border border-border/80 rounded px-2 py-1 outline-none text-xs text-foreground font-semibold"
              >
                <option value="uploaded">Sort: Upload Date</option>
                <option value="title">Sort: Document Name</option>
                <option value="expiry">Sort: Expiry Date</option>
              </select>

            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="p-4 select-none">Document Name</th>
                    <th className="p-4 select-none">Category</th>
                    <th className="p-4 select-none">Expiry Date</th>
                    <th className="p-4 select-none text-center">Status</th>
                    <th className="p-4 select-none text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        {documents.length === 0
                          ? 'No evidence records yet. Upload a PDF, DOCX, XLSX, PNG, JPG, or JPEG to start building readiness evidence.'
                          : 'No evidence files match your search parameters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map(doc => {
                      const isSelected = selectedDoc?.id === doc.id;
                      return (
                        <tr 
                          key={doc.id}
                          className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                            isSelected ? 'bg-indigo-500/5' : ''
                          }`}
                          onClick={() => handleSelectDoc(doc)}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="overflow-hidden max-w-[180px] sm:max-w-xs">
                                <span className="font-bold block truncate">{doc.title}</span>
                                <span className="text-[10px] text-muted-foreground block truncate">{doc.file_name}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-semibold text-muted-foreground">
                            {doc.category}
                          </td>
                          <td className="p-4 font-semibold text-muted-foreground">
                            {doc.expiry_date ? (
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {doc.expiry_date}
                              </span>
                            ) : (
                              <span className="text-amber-500 font-semibold italic text-[11px]">Unclassified</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${
                              doc.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                              doc.status === 'Expiring Soon' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' :
                              doc.status === 'Expired' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' :
                              'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                            }`}>
                              {doc.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectDoc(doc);
                                }}
                                className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDoc(doc.id);
                                }}
                                className="p-1.5 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-500"
                                title="Delete Document"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right column: Detail Drawer (1 col) */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm sticky top-24">
          {selectedDoc ? (
            <div className="space-y-6">
              
              {/* Drawer Header */}
              <div className="flex justify-between items-start border-b border-border/60 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Metadata Profile</span>
                  <h2 className="text-base font-extrabold truncate max-w-[200px]" title={selectedDoc.title}>
                    {selectedDoc.title}
                  </h2>
                </div>
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Editing Form */}
              <div className="space-y-4 text-xs">
                <button
                  onClick={handleOpenPrivateFile}
                  disabled={isOpeningFile}
                  className="w-full py-2 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  {isOpeningFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  Open Private File
                </button>
              {fileError && (
                <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-[11px]">
                  {fileError}
                </div>
              )}

              {saveError && (
                <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-[11px]">
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-[11px]">
                  {saveSuccess}
                </div>
              )}

                <div>
                  <label htmlFor="edit-title" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Document Title
                  </label>
                  <input
                    id="edit-title"
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="edit-category" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Category
                  </label>
                  <select
                    id="edit-category"
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  >
                    <option value="Vehicle">Vehicle</option>
                    <option value="Driver">Driver</option>
                    <option value="Facility">Facility</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="edit-issue" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Issue Date
                    </label>
                    <input
                      id="edit-issue"
                      type="date"
                      value={editIssue}
                      onChange={e => setEditIssue(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-expiry" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Expiry Date
                    </label>
                    <input
                      id="edit-expiry"
                      type="date"
                      value={editExpiry}
                      onChange={e => setEditExpiry(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="edit-review" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Review
                    </label>
                    <input
                      id="edit-review"
                      type="date"
                      value={editReview}
                      onChange={e => setEditReview(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-training" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Training
                    </label>
                    <input
                      id="edit-training"
                      type="date"
                      value={editTraining}
                      onChange={e => setEditTraining(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-calibration" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Calibration
                    </label>
                    <input
                      id="edit-calibration"
                      type="date"
                      value={editCalibration}
                      onChange={e => setEditCalibration(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-tags" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Tags
                  </label>
                  <input
                    id="edit-tags"
                    type="text"
                    value={editTags}
                    onChange={e => setEditTags(e.target.value)}
                    placeholder="fleet, driver, annual"
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>

                <button
                  onClick={handleSaveMetadata}
                  disabled={isSaving}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                  Save Primary Metadata
                </button>
              </div>

              {/* Custom Metadata Key-Value Items */}
              <div className="border-t border-border/60 pt-4 space-y-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Linked Requirements</span>
                {requirementDocuments.filter(link => link.document_id === selectedDoc.id).length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">This record is not linked to a requirement yet.</p>
                ) : (
                  <div className="space-y-2">
                    {requirementDocuments
                      .filter(link => link.document_id === selectedDoc.id)
                      .map(link => {
                        const requirement = frameworkRequirements.find(item => item.id === link.requirement_id);
                        return (
                          <div key={link.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg text-[11px]">
                            <span className="font-bold truncate">{requirement?.title || 'Requirement'}</span>
                            <button
                              onClick={() => handleUnlinkRequirement(link.requirement_id)}
                              className="text-rose-500 font-bold"
                            >
                              Unlink
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
                <div className="flex gap-2">
                  <select
                    value={selectedRequirementId}
                    onChange={e => setSelectedRequirementId(e.target.value)}
                    className="min-w-0 flex-1 px-2.5 py-1.5 bg-muted border border-border/80 rounded-md outline-none text-[11px]"
                  >
                    <option value="">Select requirement</option>
                    {frameworkRequirements.map(requirement => (
                      <option key={requirement.id} value={requirement.id}>{requirement.title}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleLinkRequirement}
                    disabled={!selectedRequirementId}
                    className="px-2.5 py-1.5 bg-indigo-600 disabled:bg-indigo-600/40 text-white rounded-md text-[10px] font-bold"
                  >
                    Link
                  </button>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4 space-y-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Audit Attributes</span>
                
                {/* Meta listing */}
                {Object.keys(selectedDoc.metadata).length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">No custom attributes assigned. Add tags for vehicle ID, garage names, or driver licence numbers below.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(selectedDoc.metadata).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg text-[11px]">
                        <span className="font-semibold text-muted-foreground">{k}:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{v}</span>
                          <button
                            onClick={() => handleRemoveMetaItem(k)}
                            className="p-0.5 text-muted-foreground hover:text-rose-500"
                            title="Remove attribute"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Meta form */}
                <div className="flex gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Attribute e.g. Fleet ID"
                    value={metaKey}
                    onChange={e => setMetaKey(e.target.value)}
                    className="w-1/2 px-2.5 py-1.5 bg-muted border border-border/80 rounded-md outline-none text-[11px]"
                  />
                  <input
                    type="text"
                    placeholder="Value e.g. HGV-99"
                    value={metaVal}
                    onChange={e => setMetaVal(e.target.value)}
                    className="w-1/2 px-2.5 py-1.5 bg-muted border border-border/80 rounded-md outline-none text-[11px]"
                  />
                </div>
                <button
                  onClick={handleAddMetaItem}
                  disabled={isSaving || !metaKey || !metaVal}
                  className="w-full py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold text-[10px] rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Attribute
                </button>
              </div>

              {/* Physical Details */}
              <div className="border-t border-border/60 pt-4 space-y-2 text-[10px] text-muted-foreground font-semibold">
                <div className="flex justify-between">
                  <span>File Storage Name:</span>
                  <span className="text-foreground font-bold">{selectedDoc.file_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>File Size:</span>
                  <span className="text-foreground font-bold">{(selectedDoc.file_size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Uploaded On:</span>
                  <span className="text-foreground font-bold">{new Date(selectedDoc.created_at).toLocaleDateString()}</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
              <FolderLock className="w-10 h-10 text-muted/30" />
              <div className="space-y-1">
                <span className="text-xs font-bold block">No Document Selected</span>
                <p className="text-[10px] max-w-[200px] leading-normal mx-auto">
                  Click a row in the registry to inspect file properties, modify expiries, or write custom metadata attributes.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Upload Dialog Modal Overlay */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="flex items-center gap-3 border-b border-border/60 pb-3 mb-5">
              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">Upload Evidence Document</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Private files are stored inside your active organisation.</p>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  File Attachment
                </label>
                <div className="border-2 border-dashed border-border/80 hover:border-indigo-500/50 rounded-xl p-6 text-center cursor-pointer transition-all bg-muted/20">
                  <Upload className="w-8 h-8 text-muted/30 mx-auto mb-2" />
                  <span className="font-semibold block text-[11px]">{newFileName || 'Select an evidence file'}</span>
                  <input
                    type="file"
                    required
                    accept={evidenceAcceptAttribute}
                    onChange={e => handleFileSelect(e.target.files?.[0] || null)}
                    className="mt-3 w-full text-center px-3 py-1.5 bg-card border border-border rounded-lg outline-none font-mono text-[10px]"
                  />
                  <p className="text-[9px] text-muted-foreground mt-2 leading-relaxed">
                    PDF, DOCX, XLSX, PNG, JPG, or JPEG. Max {formatMaxEvidenceUploadSize()}.
                  </p>
                </div>
              </div>

              {uploadError && (
                <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-[11px]">
                  {uploadError}
                </div>
              )}

              {uploadSuccess && (
                <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-[11px]">
                  {uploadSuccess}
                </div>
              )}

              <div>
                <label htmlFor="modal-title" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Compliance Document Title
                </label>
                <input
                  id="modal-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Forklift Thorough Examination Certificate"
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-cat" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Compliance Category
                  </label>
                  <select
                    id="modal-cat"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  >
                    <option value="Vehicle">Vehicle</option>
                    <option value="Driver">Driver</option>
                    <option value="Facility">Facility</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="modal-issue" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Issue Date
                  </label>
                  <input
                    id="modal-issue"
                    type="date"
                    value={newIssue}
                    onChange={e => setNewIssue(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="modal-expiry" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Expiry Date <span className="font-normal text-muted-foreground">(Leave blank if document has no expiry)</span>
                </label>
                <input
                  id="modal-expiry"
                  type="date"
                  value={newExpiry}
                  onChange={e => setNewExpiry(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="w-1/2 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center"
                >
                  Cancel
                </button>
                <button
                  id="modal-upload-submit"
                  type="submit"
                  disabled={isUploading || !newTitle || !newFile}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Record Evidence'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
