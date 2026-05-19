export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && <Icon className="w-12 h-12 text-text-muted mb-4" />}
      <h3 className="font-semibold text-text-primary text-base mb-2">{title}</h3>
      <p className="text-text-secondary text-sm max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-primary text-white rounded-full px-6 py-2.5 font-semibold text-sm active:scale-95 transition-transform"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
