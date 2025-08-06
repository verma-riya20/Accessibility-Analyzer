import React, { useState, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, Globe, Eye, Keyboard, Code, Palette, Layout, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ResultsDisplay = ({ results, onReset }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const reportRef = useRef();

  const downloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Helper function to add text with word wrapping
      const addText = (text, x, y, maxWidth, fontSize = 12) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        lines.forEach((line, index) => {
          if (y + (index * 5) > pageHeight - 20) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(line, x, y + (index * 5));
        });
        return y + (lines.length * 5) + 5;
      };

      // Header
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text('Accessibility Analysis Report', 20, yPosition);
      yPosition += 15;

      pdf.setFontSize(12);
      pdf.setFont(undefined, 'normal');
      pdf.text(`URL: ${url}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Generated: ${formatDate(timestamp)}`, 20, yPosition);
      yPosition += 15;

      // Score Summary
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text('Accessibility Score Summary', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Overall Score: ${summary.score}/100 (${getScoreLabel(summary.score)})`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Critical Issues: ${summary.criticalIssues}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Warnings: ${summary.warningIssues}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Passed Checks: ${summary.passedChecks}`, 20, yPosition);
      yPosition += 15;

      // Page Information
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text('Page Information', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Title: ${pageInfo?.title || 'No title found'}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Language Attribute: ${pageInfo?.hasLang ? 'Present' : 'Missing'}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Viewport Meta: ${pageInfo?.hasViewport ? 'Present' : 'Missing'}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`WCAG Compliance Level: ${summary.wcagLevel}`, 20, yPosition);
      yPosition += 15;

      // Issues Section
      if (issues && issues.length > 0) {
        // Check if we need a new page
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text(`Issues Found (${issues.length})`, 20, yPosition);
        yPosition += 15;

        issues.forEach((issue, index) => {
          // Check if we need a new page for this issue
          if (yPosition > pageHeight - 60) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.setFontSize(14);
          pdf.setFont(undefined, 'bold');
          pdf.text(`${index + 1}. ${issue.type.toUpperCase()}`, 20, yPosition);
          yPosition += 8;

          pdf.setFontSize(12);
          pdf.setFont(undefined, 'normal');
          yPosition = addText(`Message: ${issue.message}`, 25, yPosition, pageWidth - 45);

          if (issue.location) {
            yPosition = addText(`Location: ${issue.location}`, 25, yPosition, pageWidth - 45);
          }

          if (issue.element) {
            yPosition = addText(`Element: ${issue.element}`, 25, yPosition, pageWidth - 45);
          }

          if (issue.wcag) {
            yPosition = addText(`WCAG ${issue.wcag.guideline} (${issue.wcag.level}): ${issue.wcag.description}`, 25, yPosition, pageWidth - 45);
          }

          yPosition += 10;
        });
      }

      // Detailed Checks Section
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text('Detailed Check Results', 20, yPosition);
      yPosition += 15;

      const checkSections = [
        { title: 'Images', data: checks?.images },
        { title: 'Headings', data: checks?.headings },
        { title: 'Forms', data: checks?.forms },
        { title: 'Links', data: checks?.links },
        { title: 'Colors & Contrast', data: checks?.colors },
        { title: 'Keyboard Navigation', data: checks?.keyboard },
        { title: 'ARIA & Semantics', data: checks?.aria },
        { title: 'Semantic Structure', data: checks?.semantic }
      ];

      checkSections.forEach(section => {
        if (!section.data) return;

        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text(section.title, 20, yPosition);
        yPosition += 10;

        const hasIssues = section.data.issues && section.data.issues.length > 0;
        const errorCount = section.data.issues ? section.data.issues.filter(i => i.type === 'error').length : 0;
        const warningCount = section.data.issues ? section.data.issues.filter(i => i.type === 'warning').length : 0;

        pdf.setFontSize(12);
        pdf.setFont(undefined, 'normal');
        
        if (hasIssues) {
          pdf.text(`Status: ${errorCount} errors, ${warningCount} warnings`, 25, yPosition);
          yPosition += 8;

          section.data.issues.slice(0, 3).forEach((issue, index) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = 20;
            }
            yPosition = addText(`• ${issue.message}`, 30, yPosition, pageWidth - 55, 10);
          });

          if (section.data.issues.length > 3) {
            pdf.text(`... and ${section.data.issues.length - 3} more issues`, 30, yPosition);
            yPosition += 8;
          }
        } else {
          pdf.text('Status: Passed ✓', 25, yPosition);
          yPosition += 8;
        }

        // Add statistics if available
        const stats = [];
        if (section.data.totalImages !== undefined) stats.push(`Images: ${section.data.totalImages}`);
        if (section.data.totalLinks !== undefined) stats.push(`Links: ${section.data.totalLinks}`);
        if (section.data.totalHeadings !== undefined) stats.push(`Headings: ${section.data.totalHeadings}`);
        if (section.data.totalInputs !== undefined) stats.push(`Inputs: ${section.data.totalInputs}`);

        if (stats.length > 0) {
          pdf.text(`Statistics: ${stats.join(', ')}`, 25, yPosition);
          yPosition += 8;
        }

        yPosition += 10;
      });

      // Save the PDF
      pdf.save(`accessibility-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!results) return null;

  const { summary, pageInfo, checks, issues, url, timestamp } = results;

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Needs Work';
    return 'Poor';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Globe },
    { id: 'issues', label: 'Issues', icon: AlertTriangle },
    { id: 'details', label: 'Detailed Checks', icon: Eye }
  ];

  const renderIssueIcon = (type) => {
    switch (type) {
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const renderCheckSection = (title, check, Icon) => {
    if (!check) return null;

    const hasIssues = check.issues && check.issues.length > 0;
    const errorCount = check.issues ? check.issues.filter(i => i.type === 'error').length : 0;
    const warningCount = check.issues ? check.issues.filter(i => i.type === 'warning').length : 0;

    return (
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Icon className="w-6 h-6 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center space-x-2">
            {errorCount > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                {errorCount} errors
              </span>
            )}
            {warningCount > 0 && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                {warningCount} warnings
              </span>
            )}
            {!hasIssues && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                ✓ Passed
              </span>
            )}
          </div>
        </div>

        {check.issues && check.issues.length > 0 && (
          <div className="space-y-3">
            {check.issues.slice(0, 3).map((issue, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                {renderIssueIcon(issue.type)}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{issue.message}</p>
                  {issue.location && (
                    <p className="text-xs text-gray-500 mt-1">Location: {issue.location}</p>
                  )}
                  {issue.wcag && (
                    <p className="text-xs text-blue-600 mt-1">
                      WCAG {issue.wcag.guideline} ({issue.wcag.level}): {issue.wcag.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {check.issues.length > 3 && (
              <p className="text-sm text-gray-500 text-center">
                +{check.issues.length - 3} more issues
              </p>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {check.totalImages !== undefined && (
            <div>
              <span className="text-gray-500">Images checked:</span>
              <span className="ml-2 font-medium">{check.totalImages}</span>
            </div>
          )}
          {check.totalLinks !== undefined && (
            <div>
              <span className="text-gray-500">Links checked:</span>
              <span className="ml-2 font-medium">{check.totalLinks}</span>
            </div>
          )}
          {check.totalHeadings !== undefined && (
            <div>
              <span className="text-gray-500">Headings found:</span>
              <span className="ml-2 font-medium">{check.totalHeadings}</span>
            </div>
          )}
          {check.totalInputs !== undefined && (
            <div>
              <span className="text-gray-500">Form inputs:</span>
              <span className="ml-2 font-medium">{check.totalInputs}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={reportRef} className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Accessibility Analysis Results</h2>
            <p className="text-primary-100">
              {pageInfo?.title || 'Webpage Analysis'}
            </p>
            <p className="text-primary-200 text-sm mt-1">
              Analyzed: {formatDate(timestamp)}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onReset}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors focus:ring-2 focus:ring-white/50"
            >
              New Analysis
            </button>
            <button
              onClick={downloadPDF}
              disabled={isGeneratingPDF}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPDF ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Score Summary */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold ${getScoreColor(summary.score)}`}>
              {summary.score}
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">
              Accessibility Score
            </p>
            <p className="text-xs text-gray-500">
              {getScoreLabel(summary.score)}
            </p>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{summary.criticalIssues}</div>
            <p className="text-sm font-medium text-gray-900">Critical Issues</p>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{summary.warningIssues}</div>
            <p className="text-sm font-medium text-gray-900">Warnings</p>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{summary.passedChecks}</div>
            <p className="text-sm font-medium text-gray-900">Passed Checks</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Page Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm text-gray-500">URL:</span>
                  <p className="font-medium break-all">{url}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Title:</span>
                  <p className="font-medium">{pageInfo?.title || 'No title found'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Has lang attribute:</span>
                  <p className="font-medium">{pageInfo?.hasLang ? '✓ Yes' : '✗ No'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Has viewport meta:</span>
                  <p className="font-medium">{pageInfo?.hasViewport ? '✓ Yes' : '✗ No'}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">WCAG Compliance</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Compliance Level:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    summary.wcagLevel === 'AA' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {summary.wcagLevel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="space-y-4">
            {issues && issues.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    All Issues ({issues.length})
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span className="flex items-center space-x-1">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span>Critical</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span>Warning</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {issues.map((issue, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        {renderIssueIcon(issue.type)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{issue.message}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              issue.type === 'error' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {issue.type}
                            </span>
                          </div>

                          {issue.location && (
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Location:</strong> {issue.location}
                            </p>
                          )}

                          {issue.element && (
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Element:</strong> <code className="bg-gray-100 px-1 rounded">{issue.element}</code>
                            </p>
                          )}

                          {issue.wcag && (
                            <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                              <strong>WCAG {issue.wcag.guideline} ({issue.wcag.level}):</strong> {issue.wcag.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Issues Found!</h3>
                <p className="text-gray-600">This webpage appears to be accessible according to our checks.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Detailed Check Results</h3>

            {renderCheckSection('Images', checks?.images, Eye)}
            {renderCheckSection('Headings', checks?.headings, Layout)}
            {renderCheckSection('Forms', checks?.forms, Code)}
            {renderCheckSection('Links', checks?.links, Globe)}
            {renderCheckSection('Colors & Contrast', checks?.colors, Palette)}
            {renderCheckSection('Keyboard Navigation', checks?.keyboard, Keyboard)}
            {renderCheckSection('ARIA & Semantics', checks?.aria, Code)}
            {renderCheckSection('Semantic Structure', checks?.semantic, Layout)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsDisplay;