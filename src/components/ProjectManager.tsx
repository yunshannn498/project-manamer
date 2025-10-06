import { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { X, Copy, Check, Plus, Users, LogIn } from 'lucide-react';

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectManager({ isOpen, onClose }: ProjectManagerProps) {
  const { currentProject, projects, members, createProject, joinProject, switchProject } = useProject();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    const project = await createProject(newProjectName.trim());
    if (project) {
      setNewProjectName('');
      setShowCreateForm(false);
    }
  };

  const handleJoinProject = async () => {
    if (!inviteCode.trim()) return;

    setError('');
    const success = await joinProject(inviteCode.trim().toUpperCase());
    if (success) {
      setInviteCode('');
      setShowJoinForm(false);
    } else {
      setError('邀请码无效或已加入该项目');
    }
  };

  const handleCopyInviteCode = () => {
    if (currentProject) {
      navigator.clipboard.writeText(currentProject.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">项目管理</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {currentProject && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">当前项目</h3>
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium text-gray-800">{currentProject.name}</span>
                <button
                  onClick={handleCopyInviteCode}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {copiedCode ? (
                    <>
                      <Check size={16} className="text-green-500" />
                      <span className="text-sm text-gray-700">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span className="text-sm text-gray-700">邀请码: {currentProject.inviteCode}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="flex items-center gap-2 text-gray-700">
                  <Users size={16} />
                  <span className="text-sm font-medium">成员 ({members.length})</span>
                </div>
                <div className="mt-2 space-y-1">
                  {members.map(member => (
                    <div key={member.id} className="text-sm text-gray-600">
                      {member.userEmail || member.userId}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">我的项目</h3>
            <div className="space-y-2">
              {projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => {
                    switchProject(project.id);
                    onClose();
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    currentProject?.id === project.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-800">{project.name}</div>
                  <div className="text-xs text-gray-500 mt-1">邀请码: {project.inviteCode}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {!showCreateForm && !showJoinForm && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Plus size={18} />
                  创建项目
                </button>
                <button
                  onClick={() => setShowJoinForm(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <LogIn size={18} />
                  加入项目
                </button>
              </div>
            )}

            {showCreateForm && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-800">创建新项目</h4>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="项目名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewProjectName('');
                    }}
                    className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateProject}
                    className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    创建
                  </button>
                </div>
              </div>
            )}

            {showJoinForm && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-800">加入项目</h4>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  placeholder="输入邀请码"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase"
                  autoFocus
                  maxLength={8}
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowJoinForm(false);
                      setInviteCode('');
                      setError('');
                    }}
                    className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleJoinProject}
                    className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    加入
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
