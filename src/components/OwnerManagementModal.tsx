import { useState, useEffect } from 'react';
import { X, Plus, Save, Trash2, User } from 'lucide-react';
import { databaseService } from '../services/databaseService';

interface Owner {
  owner_name: string;
  webhook_url: string;
  open_id: string;
  is_enabled: boolean;
}

interface OwnerManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OwnerManagementModal({ isOpen, onClose }: OwnerManagementModalProps) {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingOwners, setEditingOwners] = useState<Owner[]>([]);
  const [newOwner, setNewOwner] = useState<Owner>({
    owner_name: '',
    webhook_url: '',
    open_id: '',
    is_enabled: true
  });

  useEffect(() => {
    if (isOpen) {
      loadOwners();
    }
  }, [isOpen]);

  const loadOwners = async () => {
    setLoading(true);
    const result = await databaseService.getAllOwners();
    if (result.data) {
      setOwners(result.data);
      setEditingOwners(JSON.parse(JSON.stringify(result.data)));
    }
    setLoading(false);
  };

  const handleUpdateOwner = (index: number, field: keyof Owner, value: string | boolean) => {
    const updated = [...editingOwners];
    updated[index] = { ...updated[index], [field]: value };
    setEditingOwners(updated);
  };

  const handleSaveOwner = async (owner: Owner) => {
    setSaving(true);
    await databaseService.updateOwner(owner.owner_name, {
      webhook_url: owner.webhook_url,
      open_id: owner.open_id,
      is_enabled: owner.is_enabled
    });
    await loadOwners();
    setSaving(false);
  };

  const handleAddOwner = async () => {
    if (!newOwner.owner_name.trim() || !newOwner.webhook_url.trim()) {
      alert('请填写负责人名称和 Webhook URL');
      return;
    }

    setSaving(true);
    const result = await databaseService.createOwner(newOwner);
    if (result.error) {
      alert(`添加失败: ${result.error.message}`);
    } else {
      setNewOwner({
        owner_name: '',
        webhook_url: '',
        open_id: '',
        is_enabled: true
      });
      await loadOwners();
    }
    setSaving(false);
  };

  const handleDeleteOwner = async (ownerName: string) => {
    if (!confirm(`确定要删除负责人"${ownerName}"吗？`)) {
      return;
    }

    setSaving(true);
    await databaseService.deleteOwner(ownerName);
    await loadOwners();
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b-2 border-primary-200">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <User className="text-primary-500" size={28} />
            负责人维护
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
                  添加新负责人
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      负责人名称 *
                    </label>
                    <input
                      type="text"
                      value={newOwner.owner_name}
                      onChange={(e) => setNewOwner({ ...newOwner, owner_name: e.target.value })}
                      placeholder="例如: 阿伟"
                      className="w-full px-4 py-2 border-2 border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      飞书 Open ID
                    </label>
                    <input
                      type="text"
                      value={newOwner.open_id}
                      onChange={(e) => setNewOwner({ ...newOwner, open_id: e.target.value })}
                      placeholder="例如: ou_xxxxxxxxxx"
                      className="w-full px-4 py-2 border-2 border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Webhook URL *
                    </label>
                    <input
                      type="text"
                      value={newOwner.webhook_url}
                      onChange={(e) => setNewOwner({ ...newOwner, webhook_url: e.target.value })}
                      placeholder="https://www.feishu.cn/flow/api/trigger-webhook/..."
                      className="w-full px-4 py-2 border-2 border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleAddOwner}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    添加负责人
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-gray-800 text-lg">现有负责人</h3>
                {editingOwners.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">暂无负责人</p>
                ) : (
                  editingOwners.map((owner, index) => (
                    <div
                      key={owner.owner_name}
                      className="bg-white border-2 border-gray-200 rounded-2xl p-4 space-y-3 hover:border-primary-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-800 text-lg">{owner.owner_name}</h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveOwner(owner)}
                            disabled={saving}
                            className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                            title="保存"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteOwner(owner.owner_name)}
                            disabled={saving}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                            title="删除"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          飞书 Open ID
                        </label>
                        <input
                          type="text"
                          value={owner.open_id || ''}
                          onChange={(e) => handleUpdateOwner(index, 'open_id', e.target.value)}
                          placeholder="ou_xxxxxxxxxx"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Webhook URL
                        </label>
                        <input
                          type="text"
                          value={owner.webhook_url}
                          onChange={(e) => handleUpdateOwner(index, 'webhook_url', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`enabled-${owner.owner_name}`}
                          checked={owner.is_enabled}
                          onChange={(e) => handleUpdateOwner(index, 'is_enabled', e.target.checked)}
                          className="w-5 h-5 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label
                          htmlFor={`enabled-${owner.owner_name}`}
                          className="text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          启用通知
                        </label>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t-2 border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
