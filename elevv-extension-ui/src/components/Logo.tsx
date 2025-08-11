import React from 'react';

interface LogoProps {
    className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 658 561"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <rect width="658" height="561" fill="white" />
            <ellipse cx="322" cy="276" rx="240" ry="215" fill="#D9D9D9" />
            <ellipse cx="322" cy="276" rx="240" ry="215" fill="white" />
            <path d="M183 230.5V444.5H237L236.5 178L183 230.5Z" fill="black" stroke="black" />
            <path d="M302.5 119.5L257.5 165V241L302.5 196.5V119.5Z" fill="black" />
            <path d="M302.5 236.5L257.5 280.5V355.5L302.5 312V236.5Z" fill="black" />
            <path d="M314.5 339L257.5 396V444H302.5V400.5H287.5L314.5 372.5L340 400.5H325.5V444H375L442 376.5H351L314.5 339Z" fill="black" />
            <path d="M302.5 119.5L257.5 165V241L302.5 196.5V119.5Z" stroke="black" />
            <path d="M302.5 236.5L257.5 280.5V355.5L302.5 312V236.5Z" stroke="black" />
            <path d="M314.5 339L257.5 396V444H302.5V400.5H287.5L314.5 372.5L340 400.5H325.5V444H375L442 376.5H351L314.5 339Z" stroke="black" />
            <path d="M325 188V119H471L402.5 188H325Z" fill="black" />
            <path d="M325 320V257H431.5L368.5 320H325Z" fill="black" />
            <path d="M325 188V119H471L402.5 188H325Z" stroke="black" />
            <path d="M325 188V119H471L402.5 188H325Z" stroke="black" />
            <path d="M325 320V257H431.5L368.5 320H325Z" stroke="black" />
            <path d="M325 320V257H431.5L368.5 320H325Z" stroke="black" />
        </svg>
    );
};

export default Logo;