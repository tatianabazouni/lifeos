import React from "react";
import BookPage from "./BookPage";

type Page = { title: string; content: React.ReactNode; footer?: React.ReactNode };

interface Props {
  pages?: Page[];
}

const Journal3DBook: React.FC<Props> = ({ pages = [] }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {pages.map((page, idx) => (
        <BookPage key={idx} title={page.title} content={page.content} footer={page.footer} />
      ))}
      {pages.length === 0 && (
        <div className="text-muted-foreground text-sm">No journal pages yet.</div>
      )}
    </div>
  );
};

export default Journal3DBook;
