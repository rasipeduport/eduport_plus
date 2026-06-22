import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Loader2, Search, MoreVertical, Plus, Check, X, 
  ArrowUpDown, ChevronDown, Trash
} from 'lucide-react';
import api from '../lib/api';
import NewInvitationModal from './NewInvitationModal';

export default function InvitationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Table filters and visibility
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    email: true,
    role: true,
    created_at: true,
    invited_by: true,
  });

  // Reusable New Invitation Modal triggers
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteModalRole, setInviteModalRole] = useState('STUDENT');

  // Edit / Withdraw Modal states
  const [modalType, setModalType] = useState(null); // 'edit_email' | 'withdraw'
  const [activeInvite, setActiveInvite] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  
  // Edit & Withdraw state values
  const [editEmailVal, setEditEmailVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const [currentUser, setCurrentUser] = useState(null);

  // Sorting
  const [sortField, setSortField] = useState('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchInvitations();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/api/auth/me/');
      setCurrentUser(response.data.user);
    } catch (err) {
      console.error('Failed to load current user details', err);
    }
  };

  // Check URL query parameters to auto-open the New Invitation dialog
  useEffect(() => {
    const openNew = searchParams.get('openNew') === 'true';
    const roleParam = searchParams.get('role')?.toUpperCase();
    if (openNew) {
      if (roleParam && ['STUDENT', 'MENTOR', 'TUTOR', 'ADMIN'].includes(roleParam)) {
        setInviteModalRole(roleParam);
      }
      setIsInviteModalOpen(true);
      
      // Clean up URL query parameters
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const fetchInvitations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/invitations/');
      setInvitations(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch whitelisted invitations.');
    } finally {
      setLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setOpenDropdownId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleDropdownToggle = (e, id) => {
    e.stopPropagation();
    setOpenDropdownId(openDropdownId === id ? null : id);
  };

  const openModal = (type, invite) => {
    setModalType(type);
    setActiveInvite(invite);
    setModalError('');
    setSaving(false);

    if (type === 'edit_email') {
      setEditEmailVal(invite.email);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setActiveInvite(null);
    setModalError('');
  };

  // Form submit to correct typo in whitelisted email
  const handleEditEmail = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editEmailVal.trim() || !emailRegex.test(editEmailVal.trim())) {
      setModalError('Please enter a valid email address.');
      return;
    }

    setSaving(true);
    setModalError('');
    try {
      await api.patch('/api/invitations/', {
        old_email: activeInvite.email,
        new_email: editEmailVal.trim().toLowerCase()
      });
      fetchInvitations();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update whitelisted email.');
    } finally {
      setSaving(false);
    }
  };

  // Form submit to delete/withdraw invitation
  const handleWithdrawInvitation = async () => {
    setSaving(true);
    setModalError('');
    try {
      await api.delete('/api/invitations/', {
        data: { email: activeInvite.email }
      });
      fetchInvitations();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to withdraw invitation.');
    } finally {
      setSaving(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Sorting and filtering invitations list
  const filteredInvitations = invitations.filter(invite => 
    invite.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invite.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSortedData = (dataList) => {
    return [...dataList].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'invited_by') {
        valA = a.invited_by_profile?.full_name || a.invited_by_profile?.email || '';
        valB = b.invited_by_profile?.full_name || b.invited_by_profile?.email || '';
      }

      if (valA === null || valA === undefined) return sortAsc ? 1 : -1;
      if (valB === null || valB === undefined) return sortAsc ? -1 : 1;

      if (typeof valA === 'string') {
        return sortAsc 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortAsc ? valA - valB : valB - valA;
      }
    });
  };

  const toggleColumn = (col) => {
    setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };

  if (loading && invitations.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-full box-border">
      {/* Search and Columns buttons */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Filter by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
              className="h-10 px-4 bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm font-medium hover:bg-zinc-900 transition-colors flex items-center gap-2 text-zinc-300 hover:text-white"
            >
              Columns
              <ChevronDown className="w-4 h-4" />
            </button>

            {showColumnsDropdown && (
              <div className="absolute left-0 mt-1.5 w-48 bg-[#1c1c1c] border border-white/10 rounded-xl shadow-xl py-2 z-50">
                <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/10 mb-2">
                  Toggle Columns
                </div>
                {Object.keys(visibleColumns).map(col => (
                  <label 
                    key={col} 
                    className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-xs text-zinc-300 hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[col]}
                      onChange={() => toggleColumn(col)}
                      className="rounded border-zinc-700 bg-zinc-950 text-white focus:ring-white/20"
                    />
                    <span className="capitalize">{col.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            setInviteModalRole('STUDENT');
            setIsInviteModalOpen(true);
          }}
          className="h-10 px-4 bg-white hover:bg-zinc-200 text-zinc-950 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2 self-stretch sm:self-auto shrink-0 justify-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Invitation
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 text-red-400 text-xs p-3 rounded-lg border border-red-900/50">
          {error}
        </div>
      )}

      {/* Whitelisted Invitations List */}
      <div className="border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.08)] bg-[#0f0f0f]">
                {visibleColumns.email && (
                  <th className="h-12 px-6 font-semibold text-xs text-zinc-400 align-middle">
                    <button onClick={() => handleSort('email')} className="flex items-center gap-1 hover:text-white">
                      Email
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                )}
                {visibleColumns.role && (
                  <th className="h-12 px-6 font-semibold text-xs text-zinc-400 align-middle">
                    <button onClick={() => handleSort('role')} className="flex items-center gap-1 hover:text-white">
                      Role
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                )}
                {visibleColumns.created_at && (
                  <th className="h-12 px-6 font-semibold text-xs text-zinc-400 align-middle">
                    <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 hover:text-white">
                      Invited At
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                )}
                {visibleColumns.invited_by && (
                  <th className="h-12 px-6 font-semibold text-xs text-zinc-400 align-middle">
                    <button onClick={() => handleSort('invited_by')} className="flex items-center gap-1 hover:text-white">
                      Invited by
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                )}
                <th className="h-12 px-6 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredInvitations.length === 0 ? (
                <tr>
                  <td colSpan="100%" className="py-8 text-center text-zinc-500 text-sm">
                    No whitelisted invitations found matching search criteria.
                  </td>
                </tr>
              ) : (
                getSortedData(filteredInvitations).map(invite => (
                  <tr 
                    key={invite.id} 
                    className="hover:bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.08)] h-[54px] transition-colors"
                  >
                    {visibleColumns.email && (
                      <td className="py-2 px-6 text-white text-sm font-medium align-middle whitespace-nowrap">{invite.email}</td>
                    )}
                    {visibleColumns.role && (
                      <td className="py-2 px-6 align-middle">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                          {invite.role.toLowerCase()}
                        </span>
                      </td>
                    )}
                    {visibleColumns.created_at && (
                      <td className="py-2 px-6 text-[#a1a1aa] text-sm align-middle whitespace-nowrap">
                        {new Date(invite.created_at).toLocaleString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                    )}
                    {visibleColumns.invited_by && (
                      <td className="py-2 px-6 text-zinc-300 text-sm align-middle whitespace-nowrap">
                        {invite.invited_by_profile?.full_name || invite.invited_by_profile?.email || '—'}
                      </td>
                    )}
                    <td className="py-2 px-6 align-middle text-right relative">
                      {!(currentUser?.role === 'MENTOR' && invite.role !== 'STUDENT') && (
                        <>
                          <button
                            onClick={(e) => handleDropdownToggle(e, invite.id)}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openDropdownId === invite.id && (
                            <div className="absolute right-6 mt-1 w-48 bg-[#121214] border border-[#1e1e24] rounded-lg shadow-xl py-1 z-50 text-left">
                              <div className="px-3 py-1.5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest border-b border-[#1e1e24]/70 mb-1">
                                Actions
                              </div>
                              {invite.status !== 'ACCEPTED' ? (
                                <>
                                  <button 
                                    onClick={() => openModal('edit_email', invite)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
                                  >
                                    Edit Email
                                  </button>
                                  <button 
                                    onClick={() => openModal('withdraw', invite)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/20 hover:text-red-300 border-t border-[#1e1e24]/70 mt-1 pt-2 cursor-pointer"
                                  >
                                    Withdraw Invitation
                                  </button>
                                </>
                              ) : (
                                <div className="px-3 py-1.5 text-xs text-zinc-500 italic">
                                  Invitation accepted
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal dialogs */}
      {modalType && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4">
          
          {/* Edit Email Modal */}
          {modalType === 'edit_email' && (
            <div className="w-full max-w-sm bg-[#1c1c1c] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
              <h3 className="text-base font-semibold text-white m-0">Edit Whitelisted Email</h3>
              <p className="text-xs text-zinc-400 mt-1 mb-6">Correct typographical errors in the whitelisted email address.</p>

              <form onSubmit={handleEditEmail} className="space-y-4">
                {modalError && <p className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded border border-red-900/50 m-0">{modalError}</p>}
                
                <div className="space-y-2">
                  <label htmlFor="edit-email-input" className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">Email Address</label>
                  <input
                    id="edit-email-input"
                    type="email"
                    value={editEmailVal}
                    onChange={(e) => setEditEmailVal(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                    disabled={saving}
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/10 transition-all"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Save Email
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Withdraw/Revoke Invitation Modal */}
          {modalType === 'withdraw' && (
            <div className="w-full max-w-sm bg-[#1c1c1c] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
              <h3 className="text-base font-semibold text-white m-0">Withdraw Invitation</h3>
              <p className="text-xs text-zinc-400 mt-1.5 mb-6">
                Are you sure you want to withdraw the invitation for <strong className="text-white font-semibold">{activeInvite?.email}</strong>? This email will no longer be whitelisted.
              </p>

              {modalError && <p className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded border border-red-900/50 mb-4">{modalError}</p>}

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawInvitation}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash className="w-3.5 h-3.5" />}
                  Withdraw
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Reusable invitation modal */}
      <NewInvitationModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        initialRole={inviteModalRole}
        onSuccess={fetchInvitations}
      />
    </div>
  );
}
