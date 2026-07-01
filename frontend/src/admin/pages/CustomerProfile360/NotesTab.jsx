import React, { useState, useEffect } from 'react';
import Pin from 'lucide-react/dist/esm/icons/pin';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Clock from 'lucide-react/dist/esm/icons/clock';
import { customerIntelligenceService } from '../../../services/domainServices';

export default function NotesTab({ customerId }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const data = await customerIntelligenceService.getCustomerNotes(customerId);
        setNotes(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, [customerId]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAdding(true);
    try {
      const added = await customerIntelligenceService.addNote(customerId, {
        content: newNote,
        tags: [], // Add tagging UI in future
        isPinned: false,
      });
      setNotes([added, ...notes]);
      setNewNote('');
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleTogglePin = async (noteId, currentStatus) => {
    try {
      const updated = await customerIntelligenceService.updateNote(customerId, noteId, {
        isPinned: !currentStatus,
      });
      setNotes(
        notes.map((n) => (n._id === noteId ? updated : n)).sort((a, b) => b.isPinned - a.isPinned),
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add an internal note about this customer..."
          className="w-full h-24 p-3 bg-white border border-[var(--admin-border)] rounded-lg outline-none focus:border-[var(--admin-accent)] resize-none text-sm"
        ></textarea>
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleAddNote}
            disabled={adding || !newNote.trim()}
            className="admin-btn disabled:opacity-50"
          >
            {adding ? (
              'Saving...'
            ) : (
              <>
                <Plus className="w-4 h-4" /> Add Note
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-4 mt-6">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No notes found for this customer.</div>
        ) : (
          notes.map((note) => (
            <div
              key={note._id}
              className={`p-4 rounded-lg border ${note.isPinned ? 'bg-yellow-50/50 border-yellow-200' : 'bg-white border-gray-200'} shadow-sm relative group`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                    A
                  </div>
                  <span className="text-sm font-medium text-gray-800">Admin User</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1 ml-2">
                    <Clock className="w-3 h-3" />
                    {new Date(note.createdAt).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => handleTogglePin(note._id, note.isPinned)}
                  className={`p-1 rounded hover:bg-gray-100 ${note.isPinned ? 'text-yellow-600' : 'text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity'}`}
                  title={note.isPinned ? 'Unpin note' : 'Pin note'}
                >
                  <Pin className="w-4 h-4" />
                </button>
              </div>
              <p className="text-gray-700 text-sm whitespace-pre-wrap ml-8">{note.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
