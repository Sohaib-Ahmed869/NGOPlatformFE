export default function SectionHead({ icon: Icon, title, desc }) {
  return (
    <div className="mb-6 flex items-center gap-3.5 border-b border-gray-200 pb-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center bg-gradient-to-br from-accent/20 to-accent/5 text-accent ring-1 ring-accent/15">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="font-heading text-xl font-bold text-primary">{title}</h2>
        <p className="mt-0.5 text-sm text-text-muted">{desc}</p>
      </div>
    </div>
  );
}
