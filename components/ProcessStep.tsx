export default function ProcessStep({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-md border border-zinc-800 bg-zinc-900/80 p-5 transition-all hover:border-orange-500/50">
      <p className="font-mono text-xs text-orange-400">{number}</p>
      <h3 className="mt-8 text-base font-semibold text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
    </article>
  );
}
