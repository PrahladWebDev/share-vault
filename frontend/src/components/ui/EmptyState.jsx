const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="mb-4 p-4 bg-vault-panel rounded-full border border-vault-border">
          <Icon className="h-10 w-10 text-gray-500" />
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-300 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
};

export default EmptyState;
