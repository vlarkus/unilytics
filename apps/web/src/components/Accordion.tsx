import React, { useState } from "react";

interface AccordionProps {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

export const Accordion: React.FC<AccordionProps> = ({
    title,
    defaultOpen = false,
    children,
}) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="ui-accordion">
            <button
                type="button"
                className="ui-accordion-trigger"
                aria-expanded={open}
                onClick={() => setOpen((prev) => !prev)}
            >
                <span>{title}</span>
                <svg
                    className="ui-accordion-trigger-icon"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <polyline points="4 6 8 10 12 6" />
                </svg>
            </button>
            {open && <div className="ui-accordion-body">{children}</div>}
        </div>
    );
};
