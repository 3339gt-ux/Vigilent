'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { isDemoMode } from '@/lib/env';
import { logAuditEvent } from '@/lib/auditTrail';
import {
  Building2,
  Users,
  Shield,
  UserPlus,
  Save,
  CheckCircle2,
  Mail,
  Trash2,
  X,
  Edit2,
  Ban,
  AlertTriangle,
  RefreshCw,
  Info
} from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Editor' | 'Auditor' | 'Viewer';
  status: 'Active' | 'Pending Invite' | 'Disabled';
  joined: string;
  lastActive?: string;
}

export default function OrganisationManagement() {
  const { user, organization, updateOrgProfile } = useApp();
  
  const [orgName, setOrgName] = useState('');
  const [complianceProfile, setComplianceProfile] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Invite states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Editor' | 'Auditor' | 'Viewer'>('Viewer');
  const [isInviting, setIsInviting] = useState(false);

  // Edit states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'Owner' | 'Admin' | 'Editor' | 'Auditor' | 'Viewer'>('Viewer');
  const [editStatus, setEditStatus] = useState<'Active' | 'Pending Invite' | 'Disabled'>('Active');

  // Confirmation overlay states
  const [confirmAction, setConfirmAction] = useState<null | { type: 'disable' | 'remove'; member: Member }>(null);

  // Toast notifications
  const [toast, setToast] = useState<null | { text: string; type: 'success' | 'error' | 'info' }>(null);

  // Mock members state stored locally
  const [members, setMembers] = useState<Member[]>([]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const resetDefaultMembers = () => {
    const defaultMembers: Member[] = [
      { id: '1', name: 'Jane Doe', email: 'jane.doe@apexlogistics.com', role: 'Admin', status: 'Active', joined: '2025-06-01', lastActive: 'Active now' },
      { id: '2', name: 'Marcus Vance', email: 'marcus.vance@apexlogistics.com', role: 'Editor', status: 'Active', joined: '2025-08-12', lastActive: '2026-06-04' },
      { id: '3', name: 'Stephen Gray', email: 'stephen.gray@customsauditors.co.uk', role: 'Auditor', status: 'Active', joined: '2026-01-15', lastActive: '2026-05-28' },
      { id: '4', name: 'Sarah Finch', email: 'sarah.finch@apexlogistics.com', role: 'Viewer', status: 'Pending Invite', joined: '2026-03-20', lastActive: 'Not tracked' },
    ];
    setMembers(defaultMembers);
    localStorage.setItem('vigilen_org_members', JSON.stringify(defaultMembers));
  };

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name);
      setComplianceProfile(organization.compliance_profile);
    }

    if (!isDemoMode) {
      setMembers([]);
      return;
    }

    // Seed mock members if not exists
    const stored = localStorage.getItem('vigilen_org_members');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migrate old members missing status/lastActive
        const migrated = parsed.map((m: any) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role || 'Viewer',
          status: m.status || 'Active',
          joined: m.joined || '2025-06-01',
          lastActive: m.lastActive || (m.email === 'jane.doe@apexlogistics.com' ? 'Active now' : 'Not tracked')
        }));
        setMembers(migrated);
      } catch (e) {
        console.warn('Failed parsing stored members, resetting:', e);
        resetDefaultMembers();
      }
    } else {
      resetDefaultMembers();
    }
  }, [organization]);

  const currentUserRole = user?.role || 'Viewer';
  const isAuthorized = currentUserRole === 'Admin' || currentUserRole === 'Owner';

  React.useEffect(() => {
    if (typeof window !== 'undefined' && members.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const memberId = params.get('member');
      if (memberId) {
        const match = members.find(m => m.id === memberId);
        if (match) {
          handleEditOpen(match);
        }
      }
    }
  }, [members, isAuthorized]);

  const checkIsLastAdmin = (memberId: string) => {
    const activeAdmins = members.filter(m => (m.role === 'Admin' || m.role === 'Owner') && m.status === 'Active');
    const target = members.find(m => m.id === memberId);
    if (!target) return false;
    const isTargetAdmin = target.role === 'Admin' || target.role === 'Owner';
    return isTargetAdmin && activeAdmins.length <= 1;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName) return;

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      await updateOrgProfile({
        name: orgName,
        compliance_profile: complianceProfile
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      showToast('Workspace profile updated successfully.');
    } catch (err) {
      console.error(err);
      showToast('Failed to save profile changes.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      showToast('Only Owners and Admins can manage workspace members.', 'error');
      return;
    }
    if (!inviteName || !inviteEmail) return;
    if (!isDemoMode) {
      showToast('Member invites require production onboarding and authorization.', 'error');
      return;
    }

    setIsInviting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const newMem: Member = {
        id: `mem-${Math.random().toString(36).substr(2, 9)}`,
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        status: 'Pending Invite',
        joined: new Date().toISOString().split('T')[0],
        lastActive: 'Not tracked'
      };
      
      const updated = [...members, newMem];
      setMembers(updated);
      localStorage.setItem('vigilen_org_members', JSON.stringify(updated));

      // Mock update logs
      if (typeof window !== 'undefined') {
        const logs = JSON.parse(localStorage.getItem('vigilen_logs') || '[]');
        logs.unshift({
          id: `log-${Math.random().toString(36).substr(2, 9)}`,
          organization_id: organization?.id || '',
          profile_id: user?.id || 'usr-jane-doe',
          action: 'Member Invited',
          details: `${user?.full_name || 'Jane Doe'} invited "${inviteName}" (${inviteEmail}) as Workspace ${inviteRole}.`,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('vigilen_logs', JSON.stringify(logs));
      }

      await logAuditEvent({
        actionCategory: 'Users & Admin',
        actionType: 'member_invited',
        entityType: 'user_member',
        entityId: newMem.id,
        entityLabel: newMem.name,
        description: `Invited "${inviteName}" (${inviteEmail}) as Workspace ${inviteRole}.`,
        afterSnapshot: newMem,
        severity: 'info'
      });

      showToast(`Invited ${inviteName} as ${inviteRole}.`);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('Viewer');
      setShowInviteModal(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to invite member.', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  function handleEditOpen(member: Member) {
    if (!isAuthorized) {
      showToast('Only Owners and Admins can edit members.', 'error');
      return;
    }
    setEditingMember(member);
    setEditName(member.name);
    setEditRole(member.role);
    setEditStatus(member.status);
    setShowEditModal(true);
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      showToast('Only Owners and Admins can manage members.', 'error');
      return;
    }
    if (!editingMember) return;

    // Last admin protection
    const isTargetLastAdmin = checkIsLastAdmin(editingMember.id);
    const roleChanged = editRole !== editingMember.role;
    const statusChanged = editStatus !== editingMember.status;

    if (isTargetLastAdmin && (roleChanged || editStatus === 'Disabled')) {
      showToast('Cannot disable or demote the final Owner/Admin to prevent lockouts.', 'error');
      return;
    }

    const updated = members.map(m => {
      if (m.id === editingMember.id) {
        return {
          ...m,
          name: editName,
          role: editRole,
          status: editStatus
        };
      }
      return m;
    });

    setMembers(updated);
    localStorage.setItem('vigilen_org_members', JSON.stringify(updated));

    await logAuditEvent({
      actionCategory: 'Users & Admin',
      actionType: 'member_edited',
      entityType: 'user_member',
      entityId: editingMember.id,
      entityLabel: editName,
      description: `Modified member "${editName}" (${editingMember.email}): role ${editingMember.role} -> ${editRole}, status ${editingMember.status} -> ${editStatus}.`,
      beforeSnapshot: editingMember,
      afterSnapshot: { id: editingMember.id, name: editName, role: editRole, status: editStatus },
      severity: 'info'
    });

    showToast(`Updated member "${editName}".`);
    setShowEditModal(false);
    setEditingMember(null);
  };

  const handleDisableRequest = (member: Member) => {
    if (!isAuthorized) {
      showToast('Only Owners and Admins can disable members.', 'error');
      return;
    }
    if (checkIsLastAdmin(member.id)) {
      showToast('Cannot disable the final Owner/Admin to prevent lockouts.', 'error');
      return;
    }
    setConfirmAction({ type: 'disable', member });
  };

  const handleRemoveRequest = (member: Member) => {
    if (!isAuthorized) {
      showToast('Only Owners and Admins can remove members.', 'error');
      return;
    }
    if (checkIsLastAdmin(member.id)) {
      showToast('Cannot remove the final Owner/Admin to prevent lockouts.', 'error');
      return;
    }
    setConfirmAction({ type: 'remove', member });
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, member } = confirmAction;

    try {
      if (type === 'disable') {
        const updated = members.map(m => {
          if (m.id === member.id) {
            return { ...m, status: 'Disabled' as const };
          }
          return m;
        });
        setMembers(updated);
        localStorage.setItem('vigilen_org_members', JSON.stringify(updated));

        await logAuditEvent({
          actionCategory: 'Users & Admin',
          actionType: 'member_disabled',
          entityType: 'user_member',
          entityId: member.id,
          entityLabel: member.name,
          description: `Disabled workspace member "${member.name}" (${member.email}).`,
          beforeSnapshot: member,
          afterSnapshot: { ...member, status: 'Disabled' },
          severity: 'warning'
        });

        showToast(`Disabled ${member.name} successfully.`);
      } else {
        const updated = members.filter(m => m.id !== member.id);
        setMembers(updated);
        localStorage.setItem('vigilen_org_members', JSON.stringify(updated));

        await logAuditEvent({
          actionCategory: 'Users & Admin',
          actionType: 'member_removed',
          entityType: 'user_member',
          entityId: member.id,
          entityLabel: member.name,
          description: `Removed workspace member "${member.name}" (${member.email}).`,
          beforeSnapshot: member,
          severity: 'warning'
        });

        showToast(`Removed ${member.name} from workspace.`);
      }
    } catch (err) {
      console.error(err);
      showToast('Action failed.', 'error');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleResendInvite = (member: Member) => {
    if (!isAuthorized) {
      showToast('Only Owners and Admins can manage invitations.', 'error');
      return;
    }
    // Copy a mock register URL to clipboard to simulate manual invite resend
    const mockInviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?invite=${member.id}&email=${encodeURIComponent(member.email)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(mockInviteLink);
      showToast('Manual invite link copied! Send it directly to the user.', 'info');
    } else {
      showToast('Manual invite link: ' + mockInviteLink, 'info');
    }
  };

  return (
    <div className="space-y-8 pb-12 relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] border text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-150 ${
          toast.type === 'error'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 dark:bg-rose-950/20'
            : toast.type === 'info'
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 dark:bg-blue-950/20'
            : 'bg-zinc-900 border-zinc-800 text-white dark:bg-card dark:border-border dark:text-foreground'
        }`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            toast.type === 'error' ? 'bg-rose-500' : toast.type === 'info' ? 'bg-blue-500' : 'bg-emerald-500'
          }`} />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card solid-panel border border-border w-full max-w-md rounded-2xl p-6 relative shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                onClick={() => setConfirmAction(null)}
                className="p-1 hover:bg-muted rounded-lg text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-foreground capitalize">
                {confirmAction.type} member access?
              </h3>
              <p className="text-xs text-muted-foreground">
                {confirmAction.type === 'disable'
                  ? 'Disabling this member will immediately block their access to this organisation workspace. You can re-enable them later.'
                  : 'Removing this member will delete their workspace association. To regain access, they must be invited again.'}
              </p>
            </div>

            <div className="bg-muted/40 border border-border/50 rounded-xl p-3.5 space-y-1 text-xs">
              <span className="font-extrabold uppercase text-[9px] text-indigo-650 dark:text-indigo-400 tracking-wider">
                {confirmAction.member.role}
              </span>
              <p className="font-bold text-foreground truncate">{confirmAction.member.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{confirmAction.member.email}</p>
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 border border-border bg-card hover:bg-muted text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmAction}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer capitalize"
              >
                Confirm {confirmAction.type}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Head */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight" id="org-heading">Organisation Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure organisation compliance standards and manage team collaboration roles.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* Profile Configuration Card (1 Col) */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3.5 mb-6">
            <Building2 className="w-5 h-5 text-indigo-500" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Company Workspace Profile</h2>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-lg flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Workspace changes saved successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label htmlFor="org-name-field" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Organisation Name
              </label>
              <input
                id="org-name-field"
                type="text"
                required
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none text-foreground"
              />
            </div>

            <div>
              <label htmlFor="org-profile-field" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Compliance Scope Profile
              </label>
              <select
                id="org-profile-field"
                value={complianceProfile}
                onChange={e => setComplianceProfile(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none text-foreground font-semibold"
              >
                <option value="Transport & Warehousing">Transport & Warehousing Profile</option>
                <option value="Cold Storage Logistics">Cold Storage Logistics Profile</option>
                <option value="General Commercial Distribution">General Commercial Distribution Profile</option>
              </select>
            </div>

            <button
              id="org-save-profile-btn"
              type="submit"
              disabled={isSaving || !!(organization && orgName === organization.name && complianceProfile === organization.compliance_profile)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              {isSaving ? 'Saving...' : (
                <>
                  <Save className="w-4 h-4" /> Save Workspace Profile
                </>
              )}
            </button>
          </form>

          {/* Limits overview */}
          <div className="border-t border-border/60 mt-6 pt-4 text-[10px] text-muted-foreground space-y-2 font-semibold">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-foreground">Operational Plan Status</span>
            <div className="flex justify-between">
              <span>Current Scale:</span>
              <span className="text-foreground font-extrabold">Professional Bundle (Active)</span>
            </div>
            <div className="flex justify-between">
              <span>Fleets / Depots Mapped:</span>
              <span className="text-foreground font-extrabold">4 Assets registered</span>
            </div>
            <div className="flex justify-between">
              <span>Auditor Portals:</span>
              <span className="text-foreground font-extrabold">1 Active share url</span>
            </div>
          </div>
        </div>

        {/* Member Roster list (2 Cols) */}
        <div className="xl:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm">
          
          <div className="flex justify-between items-center border-b border-border pb-3.5 mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Workspace Members ({members.length})</h2>
            </div>

            {isAuthorized ? (
              isDemoMode ? (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer"
                  id="org-invite-open-btn"
                >
                  <UserPlus className="w-4 h-4" /> Invite Member
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border text-muted-foreground text-xs font-semibold rounded-lg select-none" title="Production invitations are currently disabled.">
                  <Ban className="w-3.5 h-3.5" /> Production Invites Disabled
                </div>
              )
            ) : (
              <span className="text-[10px] font-extrabold uppercase bg-muted border border-border px-2.5 py-1 text-muted-foreground rounded-lg flex items-center gap-1 leading-none select-none">
                <Shield className="w-3.5 h-3.5" /> Read Only View
              </span>
            )}
          </div>

          {!isDemoMode && (
            <div className="mb-6 p-4 bg-indigo-500/5 border border-indigo-550/20 text-indigo-650 dark:text-indigo-400 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-4 h-4 text-indigo-500" />
                <span>Production Member Management & Invitations</span>
              </div>
              <p className="leading-relaxed">
                Collaborative team membership features are currently disabled in production mode. Real database organization membership and email invitation services must be provisioned and verified in Supabase before these features can be enabled.
              </p>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-3">User Member</th>
                  <th className="p-3">Role Authority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Registered On</th>
                  <th className="p-3">Last Active</th>
                  <th className="p-3 text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {members.map(member => {
                  const isJane = member.email === 'jane.doe@apexlogistics.com';
                  const isJaneLastAdmin = isJane && checkIsLastAdmin(member.id);

                  return (
                    <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">
                            {member.name.charAt(0)}
                          </div>
                          <div className="overflow-hidden">
                            <span className="font-extrabold block truncate text-foreground">{member.name}</span>
                            <span className="text-[10px] text-muted-foreground/95 block truncate font-medium">{member.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-semibold">
                        <span className="flex items-center gap-1 text-foreground font-bold">
                          <Shield className="w-3.5 h-3.5 text-indigo-500" />
                          {member.role}
                        </span>
                      </td>
                      <td className="p-3 font-semibold">
                        {member.status === 'Active' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                            Active
                          </span>
                        )}
                        {member.status === 'Pending Invite' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                            Pending Invite
                          </span>
                        )}
                        {member.status === 'Disabled' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-zinc-500/15 border border-zinc-500/25 text-zinc-650 dark:text-zinc-400">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-muted-foreground/95">
                        {member.joined}
                      </td>
                      <td className="p-3 font-bold text-muted-foreground/95">
                        {member.lastActive || 'Not tracked'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {member.status === 'Pending Invite' && isAuthorized && (
                            <button
                              onClick={() => handleResendInvite(member)}
                              className="p-1.5 hover:bg-indigo-550/10 hover:text-indigo-650 rounded text-muted-foreground cursor-pointer transition-colors"
                              title="Resend Invite (Manual Link)"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isAuthorized ? (
                            <>
                              <button
                                onClick={() => handleEditOpen(member)}
                                className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                title="Edit Role / Status"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {!isJaneLastAdmin && member.status === 'Active' && (
                                <button
                                  onClick={() => handleDisableRequest(member)}
                                  className="p-1.5 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-500 cursor-pointer transition-colors"
                                  title="Disable Access"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {!isJaneLastAdmin && (
                                <button
                                  onClick={() => handleRemoveRequest(member)}
                                  className="p-1.5 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-500 cursor-pointer transition-colors"
                                  title="Remove from Workspace"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isJaneLastAdmin && (
                                <span className="text-[9px] text-muted-foreground font-extrabold uppercase italic bg-muted border border-border px-2 py-0.5 rounded select-none">
                                  Owner
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="p-1 text-muted-foreground/50" title="Manage permissions required">
                              <Shield className="w-3.5 h-3.5 opacity-40" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* Invite Member Modal Overlay */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card solid-panel border border-border w-full max-w-sm rounded-2xl p-6 relative shadow-2xl">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <Mail className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="text-base font-extrabold text-foreground">Invite Workspace Collaborator</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Send a workspace access key to a teammate.</p>
              </div>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info className="w-4 h-4" />
                  <span>Manual Invitation Required</span>
                </div>
                <p className="text-[10px] leading-relaxed">
                  Email sending is not configured yet. Generating invite link copies invitation details directly.
                </p>
              </div>

              <div>
                <label htmlFor="invite-name-field" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Teammate Full Name
                </label>
                <input
                  id="invite-name-field"
                  type="text"
                  required
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="e.g. John Vance"
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none text-foreground font-semibold"
                />
              </div>

              <div>
                <label htmlFor="invite-email-field" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Email Address
                </label>
                <input
                  id="invite-email-field"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="john.vance@apexlogistics.com"
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none text-foreground font-semibold"
                />
              </div>

              <div>
                <label htmlFor="invite-role-field" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Workspace Role Authority
                </label>
                <select
                  id="invite-role-field"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none text-foreground font-semibold"
                >
                  <option value="Admin">Admin (Full write, settings, and invites)</option>
                  <option value="Editor">Editor (Upload files and link matrix cells)</option>
                  <option value="Auditor">Auditor (Read-only access, generates packages)</option>
                  <option value="Viewer">Viewer (Read-only access to matrix grids)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="w-1/2 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="org-invite-submit-btn"
                  type="submit"
                  disabled={isInviting}
                  className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white font-bold rounded-lg shadow-md cursor-pointer"
                >
                  {isInviting ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal Overlay */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card solid-panel border border-border w-full max-w-sm rounded-2xl p-6 relative shadow-2xl">
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingMember(null);
              }}
              className="absolute top-4 right-4 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <Edit2 className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="text-base font-extrabold text-foreground">Edit Workspace Member</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Modify display name, role or status.</p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {checkIsLastAdmin(editingMember.id) && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-normal font-semibold">
                    This member is the last active Owner/Admin in the workspace. Role demotion and disabling are blocked to prevent locking the workspace.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Teammate Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none text-foreground font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={editingMember.email}
                  className="w-full px-3 py-2 bg-muted border border-border/80 rounded-lg text-xs text-muted-foreground/80 cursor-not-allowed font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Workspace Role Authority
                </label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as any)}
                  disabled={checkIsLastAdmin(editingMember.id)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none text-foreground disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  <option value="Admin">Admin (Full write, settings, and invites)</option>
                  <option value="Editor">Editor (Upload files and link matrix cells)</option>
                  <option value="Auditor">Auditor (Read-only access, generates packages)</option>
                  <option value="Viewer">Viewer (Read-only access to matrix grids)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Access Status
                </label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as any)}
                  disabled={checkIsLastAdmin(editingMember.id)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none text-foreground disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  <option value="Active">Active</option>
                  <option value="Pending Invite">Pending Invite</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>

              {/* Delete Auth User Disclaimer section */}
              <div className="border-t border-border pt-4 space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Security Actions
                </span>
                <button
                  type="button"
                  disabled
                  className="w-full py-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-left px-3 text-[10px] leading-normal font-semibold opacity-60 cursor-not-allowed flex items-center justify-between"
                >
                  <span>Delete Auth User</span>
                  <span className="text-[9px] uppercase tracking-wider bg-rose-500/20 text-rose-600 px-1.5 py-0.5 rounded font-extrabold">
                    Disabled
                  </span>
                </button>
                <span className="block text-[9px] text-muted-foreground leading-normal font-medium italic">
                  * Auth user deletion requires a secure admin function and is not available from the client. Use "Remove from Workspace" instead.
                </span>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMember(null);
                  }}
                  className="w-1/2 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
