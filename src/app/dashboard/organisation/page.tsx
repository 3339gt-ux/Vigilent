'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { isDemoMode } from '@/lib/env';
import { logAuditEvent } from '@/lib/auditTrail';
import { Building2, Users, Shield, UserPlus, Save, CheckCircle2, Mail, Trash2, ArrowRight, X } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Auditor' | 'Viewer';
  joined: string;
}

export default function OrganisationManagement() {
  const { organization, updateOrgProfile } = useApp();
  
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

  // Mock members state stored locally
  const [members, setMembers] = useState<Member[]>([]);

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
      setMembers(JSON.parse(stored));
    } else {
      const defaultMembers: Member[] = [
        { id: '1', name: 'Jane Doe', email: 'jane.doe@apexlogistics.com', role: 'Admin', joined: '2025-06-01' },
        { id: '2', name: 'Marcus Vance', email: 'marcus.vance@apexlogistics.com', role: 'Editor', joined: '2025-08-12' },
        { id: '3', name: 'Stephen Gray', email: 'stephen.gray@customsauditors.co.uk', role: 'Auditor', joined: '2026-01-15' },
        { id: '4', name: 'Sarah Finch', email: 'sarah.finch@apexlogistics.com', role: 'Viewer', joined: '2026-03-20' },
      ];
      setMembers(defaultMembers);
      localStorage.setItem('vigilen_org_members', JSON.stringify(defaultMembers));
    }
  }, [organization]);

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
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;
    if (!isDemoMode) {
      alert('Member invites require production onboarding and authorization before they can be enabled.');
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
        joined: new Date().toISOString().split('T')[0]
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
          profile_id: 'usr-jane-doe',
          action: 'Member Invited',
          details: `Jane Doe invited "${inviteName}" (${inviteEmail}) as Workspace ${inviteRole}.`,
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

      setInviteName('');
      setInviteEmail('');
      setInviteRole('Viewer');
      setShowInviteModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!isDemoMode) {
      alert('Member removal requires production authorization before it can be enabled.');
      return;
    }

    if (confirm('Are you sure you want to remove this user from the organization workspace?')) {
      const memberToRemove = members.find(m => m.id === id);
      const updated = members.filter(m => m.id !== id);
      setMembers(updated);
      localStorage.setItem('vigilen_org_members', JSON.stringify(updated));

      if (memberToRemove) {
        await logAuditEvent({
          actionCategory: 'Users & Admin',
          actionType: 'member_removed',
          entityType: 'user_member',
          entityId: memberToRemove.id,
          entityLabel: memberToRemove.name,
          description: `Removed workspace member "${memberToRemove.name}" (${memberToRemove.email}).`,
          beforeSnapshot: memberToRemove,
          severity: 'warning'
        });
      }
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Head */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight" id="org-heading">Organisation Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure organization compliance standards and manage team collaboration roles.
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
                className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
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
                className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
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
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
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

            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/10"
              id="org-invite-open-btn"
            >
              <UserPlus className="w-4 h-4" /> Invite Member
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-3">User Member</th>
                  <th className="p-3">Role Authority</th>
                  <th className="p-3">Registered On</th>
                  <th className="p-3 text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {members.map(member => (
                  <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">
                          {member.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                          <span className="font-bold block truncate text-foreground">{member.name}</span>
                          <span className="text-[10px] text-muted-foreground block truncate">{member.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-semibold">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-indigo-500" />
                        {member.role}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-muted-foreground">
                      {member.joined}
                    </td>
                    <td className="p-3 text-right">
                      {/* Admin Jane Doe cannot delete herself */}
                      {member.email === 'jane.doe@apexlogistics.com' ? (
                        <span className="text-[9px] text-muted-foreground font-semibold uppercase italic bg-muted px-2 py-0.5 rounded">Owner</span>
                      ) : (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-500"
                          title="Remove user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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
              className="absolute top-4 right-4 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
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
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
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
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
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
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
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
                  className="w-1/2 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center"
                >
                  Cancel
                </button>
                <button
                  id="org-invite-submit-btn"
                  type="submit"
                  disabled={isInviting}
                  className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white font-bold rounded-lg shadow-md"
                >
                  {isInviting ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
