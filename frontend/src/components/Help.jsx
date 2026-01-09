import React from 'react';

const Help = () => {
  return (
    <div className="container mx-auto p-6 bg-white text-gray-900 rounded-lg shadow-lg">
      <h1 className="text-4xl font-extrabold mb-6 text-center">Help & Support</h1>
      <p className="text-lg mb-6 text-center">
        Need assistance? Here are some resources and tips to help you use Accessibility Analyzer effectively:
      </p>

      <div className="mt-8">
        <h2 className="text-3xl font-bold mb-4 text-center">Getting Started</h2>
        <ul className="list-disc pl-6 space-y-4 text-lg">
          <li>Enter the URL of the website you want to analyze in the input field.</li>
          <li>Click the "Analyze Website" button to start the accessibility scan.</li>
          <li>Review the results and follow the AI-powered suggestions to fix issues.</li>
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-3xl font-bold mb-4 text-center">Frequently Asked Questions</h2>
        <ul className="list-disc pl-6 space-y-4 text-lg">
          <li><strong>What is Accessibility Analyzer?</strong> A tool to identify and fix accessibility issues on websites.</li>
          <li><strong>How does it work?</strong> It scans your website and provides actionable suggestions based on WCAG standards.</li>
          <li><strong>Is it free?</strong> Yes, Accessibility Analyzer is free to use.</li>
        </ul>
      </div>

      <div className="mt-8 text-center">
        <h2 className="text-3xl font-bold mb-4">Contact Support</h2>
        <p className="text-lg mb-4">If you need further assistance, feel free to reach out to our support team:</p>
        <p>Email: <a href="mailto:support@accessibilityanalyzer.com" className="text-primary-500 hover:underline">support@accessibilityanalyzer.com</a></p>
        <p>Phone: <a href="tel:+1234567890" className="text-primary-500 hover:underline">+1 234 567 890</a></p>
      </div>
    </div>
  );
};

export default Help;