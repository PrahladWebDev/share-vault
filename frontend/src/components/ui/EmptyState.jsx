const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="mb-5 h-20 w-20 rounded-full bg-brand-600/15 flex items-center justify-center">
          <Icon className="h-9 w-9 text-brand-300" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white mb-1.5 tracking-tight">{title}</h3>
      {description && <p className="text-sm text-gray-400 max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
};

export default EmptyState;
