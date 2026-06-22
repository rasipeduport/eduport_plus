import { useState, useEffect } from 'react';
import { 
  Loader2, Search, MoreVertical, Plus, Check, X, 
  ArrowUpDown, ChevronDown, Trash, Mail
} from 'lucide-react';
import api from '../lib/api';
import NewInvitationModal from './NewInvitationModal';

export default function TutorsPage() {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Table filters and visibility
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    avatar: true,
    full_name: true,
    email: true,
    mobile_number: true,
    created_at: true,
    invited_by: true,
    students_count: true,
  });

  // Invitation Modal triggers
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Edit / Delete Modal states
  const [modalType, setModalType] = useState(null); // 'edit_details' | 'delete' | 'edit_email' | 'withdraw'
  const [activeTutor, setActiveTutor] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  
  // Form input states
  const [fullNameVal, setFullNameVal] = useState('');
  const [mobileNumberVal, setMobileNumberVal] = useState('');
  const [editEmailVal, setEditEmailVal] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Sorting
  const [sortField, setSortField] = useState('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchTutors();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/api/auth/me/');
      setCurrentUser(response.data.user);
    } catch (err) {
      console.error('Failed to load current user details', err);
    }
  };

  const fetchTutors = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/tutors/?all=true');
      setTutors(response.data.tutors || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch tutor accounts.');
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

  const openModal = (type, tutor) => {
    setModalType(type);
    setActiveTutor(tutor);
    setModalError('');
    setSaving(false);

    if (type === 'edit_details') {
      setFullNameVal(tutor.full_name || '');
      setMobileNumberVal(tutor.mobile_number || '');
    } else if (type === 'edit_email') {
      setEditEmailVal(tutor.email);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setActiveTutor(null);
    setModalError('');
  };

  const handleEditDetails = async (e) => {
    e.preventDefault();
    if (!fullNameVal.trim()) {
      setModalError('Name is required');
      return;
    }
    setSaving(true);
    setModalError('');
    try {
      await api.patch(`/api/users/${activeTutor.id}/`, {
        full_name: fullNameVal.trim(),
        mobile_number: mobileNumberVal.trim() || null
      });
      fetchTutors();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update tutor details.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    setSaving(true);
    setModalError('');
    try {
      await api.delete(`/api/users/${activeTutor.id}/`);
      fetchTutors();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setSaving(false);
    }
  };

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
        old_email: activeTutor.email,
        new_email: editEmailVal.trim().toLowerCase()
      });
      fetchTutors();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update invitation email.');
    } finally {
      setSaving(false);
    }
  };

  const handleWithdrawInvitation = async () => {
    setSaving(true);
    setModalError('');
    try {
      await api.delete('/api/invitations/', {
        data: { email: activeTutor.email }
      });
      fetchTutors();
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

  // Sorting and filtering
  const filteredTutors = tutors.filter(tutor => 
    tutor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tutor.full_name.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (loading && tutors.length === 0) {
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
              placeholder="Filter by email or name..."
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
              <div className="absolute left-0 mt-1.5 w-48 bg-[#121214] border border-[#1e1e24] rounded-xl shadow-xl py-2 z-50">
                <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-[#1e1e24]/70 mb-2">
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

        {currentUser?.role === 'ADMIN' && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="h-10 px-4 bg-white hover:bg-zinc-200 text-zinc-950 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2 self-stretch sm:self-auto shrink-0 justify-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Tutor
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-950/40 text-red-400 text-xs p-3 rounded-lg border border-red-900/50">
          {error}
        </div>
      )}

      {/* Tutors Table */}
      <div className="border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.08)] bg-[#0f0f0f]">
                {visibleColumns.avatar && <th className="h-12 px-6 font-semibold text-xs text-zinc-400 align-middle w-10"></th>}
                {visibleColumns.full_name && (
                  <th className="h-12 px-6 font-semibold text-xs text-zinc-400 align-middle">
                    <button onClick={() => handleSort('full_name')} className="flex items-center gap-1 hover:text-white">
                      Name
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                )}
                {visibleColumns.email && (
                  <th className="h-12 px-6 font-semibold text-xs text-zinc-400 align-middle">
                    <button onClick={() => handleSort('email')} className="flex items-center gap-1 hover:text-white">
                      Email
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                )}
                {visibleColumns.mobile_number && (
                  <th className="h-12 px-6 font-semibold text-xs text-zinc-400 align-middle">Phone</th>
                )}
                {visibleColumns.created_at && (
                  <th className="h-12 px-6 font-semibold text-xs text-zinc-400 align-middle">
                    <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 hover:text-white">
                      Joined at
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
                {visibleColumns.students_count && (
                  <th className="h-12 px-6 font-semibold text-xs text-zinc-400 align-middle text-center">
                    <button onClick={() => handleSort('students_count')} className="flex items-center gap-1 mx-auto hover:text-white">
                      Assigned students
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                )}
                <th className="h-12 px-6 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTutors.length === 0 ? (
                <tr>
                  <td colSpan="100%" className="py-8 text-center text-zinc-500 text-sm">
                    No tutor accounts found matching search criteria.
                  </td>
                </tr>
              ) : (
                getSortedData(filteredTutors).map(tutor => {
                  const initials = tutor.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'T';
                  return (
                    <tr 
                      key={tutor.id} 
                      className="hover:bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.08)] h-[54px] transition-colors"
                    >
                      {visibleColumns.avatar && (
                        <td className="py-2 px-6 align-middle">
                          {tutor.kind === 'ghost' ? (
                            <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center border border-zinc-700/50">
                              <Mail className="w-4 h-4" />
                            </div>
                          ) : tutor.avatar_url ? (
                            <img 
                              src={tutor.avatar_url} 
                              alt={tutor.full_name} 
                              className="w-8 h-8 rounded-full object-cover border border-[rgba(255,255,255,0.1)]"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-900/50 flex items-center justify-center font-semibold text-xs">
                              {initials}
                            </div>
                          )}
                        </td>
                      )}
                      {visibleColumns.full_name && (
                        <td className="py-2 px-6 font-medium text-white text-sm align-middle whitespace-nowrap">
                          {tutor.kind === 'ghost' ? (
                            <span className="text-zinc-500 italic font-normal">Invited</span>
                          ) : (
                            tutor.full_name || <span className="text-zinc-500">—</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.email && (
                        <td className="py-2 px-6 text-white text-sm align-middle whitespace-nowrap">{tutor.email}</td>
                      )}
                      {visibleColumns.mobile_number && (
                        <td className="py-2 px-6 text-[#a1a1aa] text-sm align-middle whitespace-nowrap">
                          {tutor.kind === 'ghost' ? '—' : (tutor.mobile_number || '—')}
                        </td>
                      )}
                      {visibleColumns.created_at && (
                        <td className="py-2 px-6 text-[#a1a1aa] text-sm align-middle whitespace-nowrap">
                          {tutor.kind === 'ghost' ? '—' : new Date(tutor.created_at).toLocaleDateString('en-US', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </td>
                      )}
                      {visibleColumns.invited_by && (
                        <td className="py-2 px-6 text-zinc-300 text-sm align-middle whitespace-nowrap">
                          {tutor.invited_by_profile?.full_name || tutor.invited_by_profile?.email || '—'}
                        </td>
                      )}
                      {visibleColumns.students_count && (
                        <td className="py-2 px-6 text-zinc-300 text-sm align-middle text-center font-mono tabular-nums">
                          {tutor.kind === 'ghost' ? '—' : (tutor.assigned_students_count ?? 0)}
                        </td>
                      )}
                      <td className="py-2 px-6 align-middle text-right relative">
                        {currentUser?.role === 'ADMIN' && (
                          <>
                            <button
                              onClick={(e) => handleDropdownToggle(e, tutor.id)}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openDropdownId === tutor.id && (
                              <div className="absolute right-6 mt-1 w-48 bg-[#121214] border border-[#1e1e24] rounded-lg shadow-xl py-1 z-50 text-left">
                                <div className="px-3 py-1.5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest border-b border-[#1e1e24]/70 mb-1">
                                  Actions
                                </div>
                                {tutor.kind === 'active' ? (
                              <>
                                <button 
                                  onClick={() => openModal('edit_details', tutor)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
                                >
                                  Edit Details
                                </button>
                                <button 
                                  onClick={() => openModal('delete', tutor)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/20 hover:text-red-300 border-t border-[#1e1e24]/70 mt-1 pt-2 cursor-pointer"
                                >
                                  Delete Tutor
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => openModal('edit_email', tutor)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
                                >
                                  Edit Email
                                </button>
                                <button 
                                  onClick={() => openModal('withdraw', tutor)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/20 hover:text-red-300 border-t border-[#1e1e24]/70 mt-1 pt-2 cursor-pointer"
                                >
                                  Withdraw Invitation
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {modalType && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4">
          
          {/* Edit Details Modal */}
          {modalType === 'edit_details' && (
            <div className="w-full max-w-sm bg-[#1c1c1c] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
              <h3 className="text-base font-semibold text-white m-0">Edit Details</h3>
              <p className="text-xs text-zinc-400 mt-1 mb-6">Update name and phone number for {activeTutor?.email}.</p>

              <form onSubmit={handleEditDetails} className="space-y-4">
                {modalError && <p className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded border border-red-900/50 m-0">{modalError}</p>}
                
                <div className="space-y-1.5">
                  <label htmlFor="edit-name" className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">Name</label>
                  <input
                    id="edit-name"
                    type="text"
                    value={fullNameVal}
                    onChange={(e) => setFullNameVal(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                    disabled={saving}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="edit-phone" className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">Phone Number</label>
                  <input
                    id="edit-phone"
                    type="text"
                    placeholder="+91 98765 43210"
                    value={mobileNumberVal}
                    onChange={(e) => setMobileNumberVal(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                    disabled={saving}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
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
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Delete Tutor Modal */}
          {modalType === 'delete' && (
            <div className="w-full max-w-sm bg-[#1c1c1c] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
              <h3 className="text-base font-semibold text-white m-0">Delete Tutor</h3>
              <p className="text-xs text-zinc-400 mt-1.5 mb-4">
                This permanently deletes <strong className="text-white font-semibold">{activeTutor?.full_name || activeTutor?.email}</strong> from the platform. Their sign-in, profile, and access are all removed. This action cannot be undone.
              </p>

              {activeTutor?.assigned_students_count > 0 && (
                <div className="bg-zinc-900 text-zinc-400 rounded-md p-3.5 border border-white/5 text-xs mb-4 leading-normal">
                  Heads up: this tutor is currently assigned to <strong className="text-white font-semibold">{activeTutor.assigned_students_count} {activeTutor.assigned_students_count === 1 ? 'student' : 'students'}</strong>. Those students will lose their tutor assignment until you reassign them.
                </div>
              )}

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
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash className="w-3.5 h-3.5" />}
                  Delete User
                </button>
              </div>
            </div>
          )}

          {/* Edit Email Modal (Ghosts) */}
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
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
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

          {/* Withdraw Invitation Modal (Ghosts) */}
          {modalType === 'withdraw' && (
            <div className="w-full max-w-sm bg-[#1c1c1c] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
              <h3 className="text-base font-semibold text-white m-0">Withdraw Invitation</h3>
              <p className="text-xs text-zinc-400 mt-1.5 mb-6">
                Are you sure you want to withdraw the invitation for <strong className="text-white font-semibold">{activeTutor?.email}</strong>? This email will no longer be whitelisted.
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

      {/* New Invitation Modal */}
      <NewInvitationModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        initialRole="TUTOR"
        onSuccess={fetchTutors}
      />
    </div>
  );
}
