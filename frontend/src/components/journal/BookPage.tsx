import React from "react";

type Props = {
  title?: string;
  content?: React.ReactNode;
  footer?: React.ReactNode;
};

const BookPage: React.FC<Props> = ({ title, content, footer }) => {
  return (
    <div className="w-full h-full bg-amber-50 text-foreground rounded-lg shadow-inner p-6 flex flex-col gap-3">
      {title && <h3 className="text-lg font-display font-semibold">{title}</h3>}
      <div className="flex-1 prose prose-sm max-w-none">{content}</div>
      {footer && <div className="text-xs text-muted-foreground">{footer}</div>}
    </div>
  );
};

export default BookPage;
