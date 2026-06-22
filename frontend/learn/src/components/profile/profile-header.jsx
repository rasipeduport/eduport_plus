import { Avatar } from '../ui/avatar';

export function ProfileHeader({ name, grade, avatarUrl }) {
  return (
    <section className="from-primary to-primary-hover relative overflow-hidden rounded-2xl bg-gradient-to-br px-5 pt-7 pb-6 md:px-7 md:pt-9 md:pb-8 shadow-md">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex flex-col items-center text-center">
        <Avatar
          src={avatarUrl}
          alt={name}
          size="lg"
          fallback={name}
          className="mb-4 border-2 border-white/30"
        />
        <h2 className="text-2xl font-bold text-white md:text-3xl">
          {name}
        </h2>
        {grade && <p className="mt-1 text-sm text-white/75">{grade}</p>}
      </div>
    </section>
  );
}
