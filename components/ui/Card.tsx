type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Card({
  children,
  className = "",
}: CardProps) {
  return (
    <div
      className={`
        rounded-2xl border border-[#E6EEF9] bg-white
        p-4 shadow-sm
        md:rounded-3xl md:p-6
        ${className}
      `}
    >
      {children}
    </div>
  );
}