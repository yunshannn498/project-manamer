import { useState, useEffect } from 'react';
import { X, Plus, Save, Trash2, Briefcase, Search } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { Client } from '../types';

interface ClientManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ClientManagementModal({ isOpen, onClose }: ClientManagementModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({
    clientName: '',
    ongoingProjects: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadClients();
    }
  }, [isOpen]);

  const loadClients = async () => {
    setLoading(true);
    const result = await databaseService.getClients();
    if (result.data) {
      setClients(result.data);
    }
    setLoading(false);
  };

  const handleEditClient = (client: Client) => {
    setEditingId(client.id);
    setEditingClient({ ...client });
  };

  const handleSaveClient = async () => {
    if (!editingClient || !editingClient.clientName.trim()) {
      alert('客户名称不能为空');
      return;
    }

    setSaving(true);
    await databaseService.updateClient(editingClient.id, {
      clientName: editingClient.clientName,
      ongoingProjects: editingClient.ongoingProjects,
      notes: editingClient.notes
    });
    await loadClients();
    setEditingId(null);
    setEditingClient(null);
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingClient(null);
  };

  const handleAddClient = async () => {
    if (!newClient.clientName.trim()) {
      alert('请填写客户名称');
      return;
    }

    setSaving(true);
    const result = await databaseService.createClient(newClient);
    if (result.error) {
      alert(`添加失败: ${result.error.message}`);
    } else {
      setNewClient({
        clientName: '',
        ongoingProjects: '',
        notes: ''
      });
      await loadClients();
    }
    setSaving(false);
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!confirm(`确定要删除客户"${clientName}"吗？`)) {
      return;
    }

    setSaving(true);
    await databaseService.deleteClient(clientId);
    await loadClients();
    setSaving(false);
  };

  const filteredClients = clients.filter(client =>
    client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.ongoingProjects?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b-2 border-primary-200">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Briefcase className="text-primary-500" size={28} />
            客户备忘录
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-2xl p-4 border-2 border-primary-200">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Plus size={20} className="text-primary-500" />
                  添加新客户
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      客户名称 *
                    </label>
                    <input
                      type="text"
                      value={newClient.clientName}
                      onChange={(e) => setNewClient({ ...newClient, clientName: e.target.value })}
                      placeholder="例如: ABC公司"
                      className="w-full px-4 py-2 border-2 border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      进行中的项目
                    </label>
                    <textarea
                      value={newClient.ongoingProjects}
                      onChange={(e) => setNewClient({ ...newClient, ongoingProjects: e.target.value })}
                      placeholder="例如: 品牌升级项目、网站改版..."
                      rows={2}
                      className="w-full px-4 py-2 border-2 border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      备注
                    </label>
                    <textarea
                      value={newClient.notes}
                      onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                      placeholder="其他需要记录的信息..."
                      rows={2}
                      className="w-full px-4 py-2 border-2 border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all resize-none"
                    />
                  </div>
                  <button
                    onClick={handleAddClient}
                    disabled={saving || !newClient.clientName.trim()}
                    className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <Plus size={18} />
                        添加客户
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 relative">
                    <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索客户..."
                      className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all"
                    />
                  </div>
                </div>

                <h3 className="font-bold text-gray-800 mb-3">
                  客户列表 ({filteredClients.length})
                </h3>

                {filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? '没有找到匹配的客户' : '还没有添加客户'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className="bg-white border-2 border-gray-200 rounded-2xl p-4 hover:border-primary-300 transition-all"
                      >
                        {editingId === client.id && editingClient ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                客户名称 *
                              </label>
                              <input
                                type="text"
                                value={editingClient.clientName}
                                onChange={(e) => setEditingClient({ ...editingClient, clientName: e.target.value })}
                                className="w-full px-3 py-2 border-2 border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                进行中的项目
                              </label>
                              <textarea
                                value={editingClient.ongoingProjects || ''}
                                onChange={(e) => setEditingClient({ ...editingClient, ongoingProjects: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border-2 border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all resize-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                备注
                              </label>
                              <textarea
                                value={editingClient.notes || ''}
                                onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border-2 border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all resize-none"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveClient}
                                disabled={saving}
                                className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                              >
                                {saving ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                ) : (
                                  <>
                                    <Save size={16} />
                                    保存
                                  </>
                                )}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-xl transition-all"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                  <Briefcase size={18} className="text-primary-500" />
                                  {client.clientName}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">
                                  更新于 {new Date(client.updatedAt).toLocaleString('zh-CN')}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditClient(client)}
                                  className="p-2 hover:bg-primary-100 text-primary-600 rounded-lg transition-colors"
                                  title="编辑"
                                >
                                  <Save size={18} />
                                </button>
                                <button
                                  onClick={() => handleDeleteClient(client.id, client.clientName)}
                                  className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                  title="删除"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>

                            {client.ongoingProjects && (
                              <div className="mb-2">
                                <p className="text-sm font-semibold text-gray-700 mb-1">进行中的项目：</p>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{client.ongoingProjects}</p>
                              </div>
                            )}

                            {client.notes && (
                              <div>
                                <p className="text-sm font-semibold text-gray-700 mb-1">备注：</p>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{client.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
