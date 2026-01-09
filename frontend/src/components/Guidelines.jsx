import React from 'react';

const Guidelines = () => {
  return (
    <div className="container mx-auto p-6 bg-white text-gray-900 rounded-lg shadow-lg">
      <h1 className="text-4xl font-extrabold mb-6 text-center">Accessibility Guidelines</h1>
      <p className="text-lg mb-6 text-center">
        Follow these general guidelines to ensure your website is accessible to all users, including those with disabilities:
      </p>

      <div className="mt-8">
        <h2 className="text-3xl font-bold mb-4 text-center">General Principles</h2>
        <ul className="list-disc pl-6 space-y-4 text-lg">
          <li>Provide text alternatives for non-text content, such as images and videos.</li>
          <li>Ensure all functionality is accessible via keyboard navigation.</li>
          <li>Use sufficient color contrast between text and background.</li>
          <li>Provide clear and descriptive labels for form elements.</li>
          <li>Ensure your website is operable on various devices and screen sizes.</li>
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-3xl font-bold mb-4 text-center">WCAG Guidelines</h2>
        <ul className="list-disc pl-6 space-y-4 text-lg">
          <li>Perceivable: Make content available to all senses (e.g., text alternatives, captions).</li>
          <li>Operable: Ensure users can interact with all elements (e.g., keyboard accessibility).</li>
          <li>Understandable: Make content and navigation intuitive and easy to understand.</li>
          <li>Robust: Ensure compatibility with assistive technologies and future standards.</li>
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-3xl font-bold mb-4 text-center">Best Practices</h2>
        <ul className="list-disc pl-6 space-y-4 text-lg">
          <li>Test your website with screen readers and other assistive technologies.</li>
          <li>Use semantic HTML to provide meaningful structure to your content.</li>
          <li>Minimize the use of animations that may trigger seizures or discomfort.</li>
          <li>Provide users with options to customize font size and color schemes.</li>
          <li>Regularly audit your website for accessibility compliance.</li>
        </ul>
      </div>
    </div>
  );
};

export default Guidelines;