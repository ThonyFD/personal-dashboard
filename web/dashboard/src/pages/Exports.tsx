import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTransactions } from '../api/dataconnect-client'
import { formatCurrency } from '../utils/format'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// Report templates
const REPORT_TEMPLATES = {
  monthly_summary: {
    name: 'Monthly Financial Summary',
    description: 'Complete overview of income, expenses, and cash flow for the selected month',
    icon: '📊'
  },
  budget_report: {
    name: 'Budget Performance Report',
    description: 'Detailed analysis of budget vs actual spending by category',
    icon: '🎯'
  },
  goals_progress: {
    name: 'Financial Goals Progress',
    description: 'Status update on all active financial goals and milestones',
    icon: '🏆'
  },
  recurring_analysis: {
    name: 'Recurring Expenses Analysis',
    description: 'Comprehensive analysis of recurring payment patterns and predictions',
    icon: '🔄'
  },
  yearly_comparison: {
    name: 'Year-over-Year Comparison',
    description: 'Historical comparison of financial performance across years',
    icon: '📈'
  }
}

export default function Exports() {
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof REPORT_TEMPLATES>('monthly_summary')
  const [selectedPeriod, setSelectedPeriod] = useState(new Date())
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf')
  const [isExporting, setIsExporting] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  // Get data for the selected period
  const periodStart = startOfMonth(selectedPeriod)
  const periodEnd = endOfMonth(selectedPeriod)

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', 10000, format(periodStart, 'yyyy-MM-dd'), format(periodEnd, 'yyyy-MM-dd')],
    queryFn: () => fetchTransactions(10000, format(periodStart, 'yyyy-MM-dd'), format(periodEnd, 'yyyy-MM-dd')),
  })

  // Calculate report data based on template
  const reportData = useState(() => {
    if (!transactions) return null

    const income = transactions
      .filter(t => t.txn_type === 'PAYMENT')
      .reduce((sum, t) => sum + t.amount, 0)

    const expenses = transactions
      .filter(t => t.txn_type === 'PURCHASE')
      .reduce((sum, t) => sum + t.amount, 0)

    const expensesByCategory = transactions
      .filter(t => t.txn_type === 'PURCHASE')
      .reduce((acc, t) => {
        const category = t.merchant?.categoryRef?.name || 'Uncategorized'
        acc[category] = (acc[category] || 0) + t.amount
        return acc
      }, {} as Record<string, number>)

    return {
      period: format(selectedPeriod, 'MMMM yyyy'),
      totalTransactions: transactions.length,
      income,
      expenses,
      netCashFlow: income - expenses,
      expensesByCategory,
      topExpenseCategory: Object.entries(expensesByCategory)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'
    }
  })[0]

  // Export to CSV
  const exportToCSV = (data: any, filename: string) => {
    let csvContent = ''

    if (selectedTemplate === 'monthly_summary') {
      // CSV headers
      csvContent = 'Category,Amount,Percentage\n'

      // Add data rows
      Object.entries(data.expensesByCategory).forEach(([category, amount]) => {
        const percentage = ((amount as number) / data.expenses * 100).toFixed(1)
        csvContent += `"${category}","${formatCurrency(amount as number)}","${percentage}%\n"`
      })

      // Add summary
      csvContent += `"Total Income","${formatCurrency(data.income)}","100%"\n`
      csvContent += `"Total Expenses","${formatCurrency(data.expenses)}","100%"\n`
      csvContent += `"Net Cash Flow","${formatCurrency(data.netCashFlow)}",""\n`
    }

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Export to PDF
  const exportToPDF = async () => {
    if (!reportRef.current) return

    setIsExporting(true)

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')

      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Add footer with generation info
      const pageCount = pdf.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(128, 128, 128)
        pdf.text(
          `Generated by AI Finance Agent on ${format(new Date(), 'PPP')}`,
          10,
          pdf.internal.pageSize.height - 10
        )
      }

      pdf.save(`${REPORT_TEMPLATES[selectedTemplate].name.replace(/\s+/g, '_')}_${format(selectedPeriod, 'yyyy_MM')}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExport = () => {
    if (!reportData) return

    const filename = `${REPORT_TEMPLATES[selectedTemplate].name.replace(/\s+/g, '_')}_${format(selectedPeriod, 'yyyy_MM')}`

    if (exportFormat === 'csv') {
      exportToCSV(reportData, filename)
    } else {
      exportToPDF()
    }
  }

  if (isLoading) {
    return <div className="loading">Loading export data...</div>
  }

  return (
    <div>
      <h1>Export Financial Reports</h1>

      {/* Export Configuration */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Export Configuration</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Report Template Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Report Type
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value as keyof typeof REPORT_TEMPLATES)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            >
              {Object.entries(REPORT_TEMPLATES).map(([key, template]) => (
                <option key={key} value={key}>
                  {template.icon} {template.name}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
              {REPORT_TEMPLATES[selectedTemplate].description}
            </p>
          </div>

          {/* Period Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Report Period
            </label>
            <input
              type="month"
              value={format(selectedPeriod, 'yyyy-MM')}
              onChange={(e) => setSelectedPeriod(new Date(e.target.value))}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Export Format */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Export Format
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'csv')}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            >
              <option value="pdf">📄 PDF Report (with charts)</option>
              <option value="csv">📊 CSV Data Export</option>
            </select>
          </div>
        </div>

        {/* Export Button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleExport}
            disabled={isExporting || !reportData}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              opacity: isExporting ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {isExporting ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #ffffff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Generating {exportFormat.toUpperCase()}...
              </>
            ) : (
              <>
                📤 Export {REPORT_TEMPLATES[selectedTemplate].name}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Preview */}
      <div className="card">
        <h2>Report Preview - {REPORT_TEMPLATES[selectedTemplate].name}</h2>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          Preview of the report that will be exported for {reportData?.period}
        </p>

        <div
          ref={reportRef}
          style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          {/* Report Header */}
          <div style={{
            textAlign: 'center',
            borderBottom: '2px solid #333',
            paddingBottom: '1rem',
            marginBottom: '2rem'
          }}>
            <h1 style={{ margin: '0 0 0.5rem 0', color: '#333', fontSize: '2rem' }}>
              {REPORT_TEMPLATES[selectedTemplate].icon} {REPORT_TEMPLATES[selectedTemplate].name}
            </h1>
            <h2 style={{ margin: '0', color: '#666', fontSize: '1.2rem', fontWeight: 'normal' }}>
              {reportData?.period}
            </h2>
            <p style={{ margin: '0.5rem 0 0 0', color: '#888', fontSize: '0.9rem' }}>
              Generated on {format(new Date(), 'PPP')}
            </p>
          </div>

          {reportData && (
            <>
              {/* Summary Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Total Income</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#38a169' }}>
                    ${formatCurrency(reportData.income)}
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Total Expenses</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e53e3e' }}>
                    ${formatCurrency(reportData.expenses)}
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Net Cash Flow</div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: reportData.netCashFlow >= 0 ? '#38a169' : '#e53e3e'
                  }}>
                    ${formatCurrency(reportData.netCashFlow)}
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Transactions</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3182ce' }}>
                    {reportData.totalTransactions}
                  </div>
                </div>
              </div>

              {/* Expenses by Category Table */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: '#333', borderBottom: '1px solid #e0e0e0', paddingBottom: '0.5rem' }}>
                  Expenses by Category
                </h3>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e0e0e0' }}>Category</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', border: '1px solid #e0e0e0' }}>Amount</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', border: '1px solid #e0e0e0' }}>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(reportData.expensesByCategory)
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .map(([category, amount]) => (
                        <tr key={category}>
                          <td style={{ padding: '0.75rem', border: '1px solid #e0e0e0' }}>{category}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', border: '1px solid #e0e0e0' }}>
                            ${formatCurrency(amount as number)}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', border: '1px solid #e0e0e0' }}>
                            {((amount as number) / reportData.expenses * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                      <td style={{ padding: '0.75rem', border: '1px solid #e0e0e0' }}>Total</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', border: '1px solid #e0e0e0' }}>
                        ${formatCurrency(reportData.expenses)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', border: '1px solid #e0e0e0' }}>100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Key Insights */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Key Insights</h3>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                  <li>Your largest expense category this month was <strong>{reportData.topExpenseCategory}</strong></li>
                  <li>You had <strong>{reportData.totalTransactions}</strong> total transactions this month</li>
                  <li>Your net cash flow was <strong>${formatCurrency(Math.abs(reportData.netCashFlow))}</strong> {reportData.netCashFlow >= 0 ? 'positive' : 'negative'}</li>
                  <li>This represents a {((reportData.expenses / reportData.income) * 100).toFixed(1)}% expense ratio</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Scheduled Reports Section */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2>📅 Scheduled Reports (Coming Soon)</h2>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          Set up automatic report generation and email delivery
        </p>

        <div style={{
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '2px dashed #ddd'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏰</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#666' }}>Automated Reports</h3>
          <p style={{ margin: '0', color: '#888' }}>
            Schedule monthly reports to be automatically generated and sent to your email.
            <br />
            <em>This feature will be available in a future update.</em>
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  )
}