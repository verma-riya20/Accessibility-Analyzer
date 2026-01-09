import React from 'react';

const About = () => {
  return (
    <div className="container mx-auto p-6 bg-white text-gray-900 rounded-lg shadow-lg">
      <h1 className="text-4xl font-extrabold mb-6 text-center">About Accessibility Analyzer</h1>
      <p className="text-lg mb-6 text-center">
        Accessibility Analyzer is a powerful tool designed to help developers and designers ensure their websites are accessible to everyone, including individuals with disabilities. By analyzing your website, it identifies critical accessibility issues and provides actionable AI-powered suggestions to improve inclusivity and user experience.
      </p>

      <div className="mt-8">
        <h2 className="text-3xl font-bold mb-4 text-center">Why Accessibility Matters</h2>
        <ul className="list-disc pl-6 space-y-4 text-lg">
          <li>Improves user experience for everyone, including people with disabilities.</li>
          <li>Ensures compliance with legal standards like WCAG and ADA.</li>
          <li>Expands your audience by making your website usable for all.</li>
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-3xl font-bold mb-4 text-center">Features of Accessibility Analyzer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-100 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-bold mb-2">AI-Powered Suggestions</h3>
            <p>Get actionable recommendations to fix accessibility issues using advanced AI technology.</p>
          </div>
          <div className="bg-gray-100 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-bold mb-2">Detailed Reports</h3>
            <p>Generate comprehensive reports highlighting critical issues and areas for improvement.</p>
          </div>
          <div className="bg-gray-100 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-bold mb-2">Interactive Heatmaps</h3>
            <p>Visualize accessibility issues on your webpage with intuitive heatmaps.</p>
          </div>
          <div className="bg-gray-100 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-bold mb-2">WCAG Compliance</h3>
            <p>Ensure your website meets WCAG 2.1 AA standards for accessibility.</p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <h2 className="text-3xl font-bold mb-4">Get Started</h2>
        <p className="text-lg mb-4">Ready to make your website accessible? Start by analyzing your website today!</p>
        <button className="bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors">
          Analyze Website
        </button>
      </div>
    </div>
  );
};

export default About;