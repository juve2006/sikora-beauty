import { useFormatter } from 'next-intl';

// A post's day in the page's language, at the store's time (src/i18n/request.ts): 14 листопада 2026.
const PostDate = ({
  date,
  className,
}: {
  date: string;
  className?: string;
}) => {
  const format = useFormatter();
  return (
    <time dateTime={date} className={className}>
      {format.dateTime(new Date(date), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}
    </time>
  );
};

export default PostDate;
