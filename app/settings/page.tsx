'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  BuildingOffice2Icon,
  UserGroupIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '../../components/layout/AppShell';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { Dialog } from '../../components/ui/Dialog';

interface WorkspaceInfo {
  id: string;
  name: string;
  createdAt: string;
}

interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'ANALYST' | 'VIEWER';
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role || 'VIEWER';
  const isAdmin = userRole === 'ADMIN';

  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite user modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'ANALYST' | 'VIEWER'>('VIEWER');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Edit user role modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<WorkspaceUser | null>(null);
  const [editingRole, setEditingRole] = useState<'ADMIN' | 'ANALYST' | 'VIEWER'>('VIEWER');
  const [savingRole, setSavingRole] = useState(false);

  // Delete user modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<WorkspaceUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchWorkspaceAndUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const wsRes = await fetch('/api/workspace');
      if (!wsRes.ok) throw new Error('Failed to retrieve workspace details.');
      const wsJson = await wsRes.json();
      setWorkspace(wsJson.data);

      if (isAdmin) {
        const usersRes = await fetch('/api/workspace/users');
        if (usersRes.ok) {
          const usersJson = await usersRes.json();
          setUsers(usersJson.data || []);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading settings.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchWorkspaceAndUsers();
  }, [fetchWorkspaceAndUsers]);

  const handleInviteUser = async () => {
    if (!inviteName || !inviteEmail || !invitePassword) {
      setInviteError('Please fill in all user details.');
      return;
    }
    setInviteError(null);
    setInviting(true);

    try {
      const res = await fetch('/api/workspace/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          password: invitePassword,
          role: inviteRole,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Failed to add workspace user.');
      }

      setInviteModalOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInvitePassword('');
      fetchWorkspaceAndUsers();
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    setSavingRole(true);
    try {
      const res = await fetch(`/api/workspace/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editingRole }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Failed to update user role.');
      }

      setEditModalOpen(false);
      setSelectedUser(null);
      fetchWorkspaceAndUsers();
    } catch (err: any) {
      alert(err.message || 'Role update error');
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/workspace/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Failed to delete user.');
      }

      setDeleteModalOpen(false);
      setUserToDelete(null);
      fetchWorkspaceAndUsers();
    } catch (err: any) {
      alert(err.message || 'Deletion error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="page-title">Workspace & Settings</h1>
          <p className="page-description">
            Manage workspace metadata, access control, and team members
          </p>
        </div>

        {loading && <Skeleton variant="card" count={2} />}

        {error && !loading && (
          <ErrorState message={error} onRetry={fetchWorkspaceAndUsers} />
        )}

        {!loading && !error && workspace && (
          <div className="space-y-6">
            {/* Workspace Profile Card */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <BuildingOffice2Icon className="w-5 h-5 text-secondary" aria-hidden="true" />
                <CardHeader title="Workspace Profile" subtitle="General workspace details" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-secondary block font-medium">Workspace Name</span>
                  <p className="text-sm font-semibold text-primary mt-1">{workspace.name}</p>
                </div>
                <div>
                  <span className="text-secondary block font-medium">Workspace ID</span>
                  <p className="text-xs text-secondary font-mono mt-1 select-all">{workspace.id}</p>
                </div>
                <div>
                  <span className="text-secondary block font-medium">Created On</span>
                  <p className="text-xs text-primary mt-1">
                    {new Date(workspace.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>

            {/* Team Members Management (ADMIN only) */}
            {isAdmin ? (
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserGroupIcon className="w-5 h-5 text-secondary" aria-hidden="true" />
                    <CardHeader
                      title="Team Members"
                      subtitle="Users with access to this workspace and their role permissions"
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setInviteModalOpen(true)}
                  >
                    <PlusIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    Add User
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border text-secondary font-semibold uppercase tracking-wider">
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3">Role</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-primary">
                            {u.name}
                            {u.id === currentUserId && (
                              <span className="ml-1.5 text-[10px] text-secondary font-normal italic">
                                (You)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-secondary">{u.email}</td>
                          <td className="py-2.5 px-3">
                            <Badge type="role" value={u.role} />
                          </td>
                          <td className="py-2.5 px-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(u);
                                setEditingRole(u.role);
                                setEditModalOpen(true);
                              }}
                              className="inline-flex items-center text-xs text-accent hover:underline font-medium"
                            >
                              <PencilSquareIcon className="w-3.5 h-3.5 mr-0.5" aria-hidden="true" />
                              Edit role
                            </button>
                            {u.id !== currentUserId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setUserToDelete(u);
                                  setDeleteModalOpen(true);
                                }}
                                className="inline-flex items-center text-xs text-negative hover:underline font-medium"
                              >
                                <TrashIcon className="w-3.5 h-3.5 mr-0.5" aria-hidden="true" />
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card className="p-5 text-center text-xs text-secondary">
                <p>Team member administration is restricted to workspace Administrators.</p>
              </Card>
            )}
          </div>
        )}

        {/* Invite User Dialog */}
        <Dialog
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          title="Add Workspace Team Member"
          description="Create credentials for a new member to join this workspace."
          confirmLabel="Add Member"
          onConfirm={handleInviteUser}
          loading={inviting}
        >
          <div className="space-y-3 pt-1">
            {inviteError && (
              <p className="text-xs text-negative font-medium" role="alert">
                {inviteError}
              </p>
            )}

            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. Alex Smith"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              required
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="alex@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />

            <Input
              label="Temporary Password"
              type="password"
              placeholder="Minimum 6 characters"
              value={invitePassword}
              onChange={(e) => setInvitePassword(e.target.value)}
              required
            />

            <Select
              label="Role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              options={[
                { value: 'VIEWER', label: 'VIEWER (Read-only access)' },
                { value: 'ANALYST', label: 'ANALYST (Manage feedback, generate reports)' },
                { value: 'ADMIN', label: 'ADMIN (Full control including user management)' },
              ]}
            />
          </div>
        </Dialog>

        {/* Edit Role Dialog */}
        <Dialog
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit Role: ${selectedUser?.name}`}
          confirmLabel="Save Role"
          onConfirm={handleUpdateRole}
          loading={savingRole}
        >
          <div className="pt-2">
            <Select
              label="Assigned Role"
              value={editingRole}
              onChange={(e) => setEditingRole(e.target.value as any)}
              options={[
                { value: 'VIEWER', label: 'VIEWER (Read-only access)' },
                { value: 'ANALYST', label: 'ANALYST (Manage feedback, generate reports)' },
                { value: 'ADMIN', label: 'ADMIN (Full control including user management)' },
              ]}
            />
          </div>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Remove User from Workspace"
          description={`Are you sure you want to remove ${userToDelete?.name} (${userToDelete?.email})? They will immediately lose access to this workspace.`}
          confirmLabel="Remove User"
          confirmVariant="destructive"
          onConfirm={handleDeleteUser}
          loading={deleting}
        />
      </div>
    </AppShell>
  );
}
