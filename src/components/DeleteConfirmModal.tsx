interface DeleteConfirmModalProps {
  isOpen: boolean;
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  taskTitle,
  onConfirm,
  onCancel
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-pop border-2 border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-gray-900 mb-3">确认删除任务</h3>
        <p className="text-gray-600 mb-3 font-medium">确定要删除以下任务吗？</p>
        <p className="text-gray-900 font-semibold mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border-2 border-red-100 shadow-sm">
          {taskTitle}
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-300 active:scale-95 font-semibold shadow-sm hover:shadow"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-3 text-white bg-gradient-to-r from-red-500 to-rose-600 rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 active:scale-95 font-semibold shadow-lg hover:shadow-xl"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}
