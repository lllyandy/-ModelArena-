import * as XLSX from 'xlsx';
import { VoteResult, ModelConfig } from '../types';

export const exportToExcel = (results: VoteResult[], models: ModelConfig[]) => {
  const workbook = XLSX.utils.book_new();

  // --- SHEET 1: DETAILED RESULTS ---
  const detailData = results.map((r, index) => {
    const row: any = {
      'ID': index + 1,
      'Case Name': r.caseName,
      'Winner': r.winnerModelId === 'TIE' ? 'Tie' : models.find(m => m.id === r.winnerModelId)?.name || r.winnerModelId,
      'Date': new Date(r.timestamp).toLocaleString(),
    };

    // Add columns for each model's detailed stats
    models.forEach(m => {
      const rating = r.ratings[m.id];
      row[`${m.name} Score`] = rating?.score ?? 0;
      row[`${m.name} Amazing`] = rating?.isAmazing ? 'YES' : '-';
      row[`${m.name} Note`] = rating?.note || '';
    });

    return row;
  });

  const detailSheet = XLSX.utils.json_to_sheet(detailData);
  // Auto-width columns
  const detailCols = Object.keys(detailData[0] || {}).map(() => ({ wch: 15 }));
  detailSheet['!cols'] = detailCols;

  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detailed Results');

  // --- SHEET 2: SUMMARY STATISTICS ---
  const totalCases = results.length;
  const tieCount = results.filter(r => r.winnerModelId === 'TIE').length;
  const tieRate = totalCases > 0 ? ((tieCount / totalCases) * 100).toFixed(1) + '%' : '0%';

  const summaryData = models.map(m => {
    let totalScore = 0;
    let amazingCount = 0;
    let winCount = 0;

    results.forEach(r => {
      const rating = r.ratings[m.id];
      if (rating) {
        totalScore += rating.score;
        if (rating.isAmazing) amazingCount++;
      }
      if (r.winnerModelId === m.id) {
        winCount++;
      }
    });

    const avgScore = totalCases > 0 ? (totalScore / totalCases).toFixed(2) : '0.00';
    const winRate = totalCases > 0 ? ((winCount / totalCases) * 100).toFixed(1) + '%' : '0%';

    return {
      'Model Name': m.name,
      'Total Wins': winCount,
      'Win Rate (GSB)': winRate, // GSB proxy: Higher win rate = Better
      'Avg Score (0-1)': avgScore,
      'Amazing Count': amazingCount,
      'Total Ties (Global)': tieCount,
      'Tie Rate (Global)': tieRate
    };
  });

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  const summaryCols = Object.keys(summaryData[0] || {}).map(() => ({ wch: 20 }));
  summarySheet['!cols'] = summaryCols;

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary Stats');

  // Generate filename
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `video_eval_results_${dateStr}.xlsx`);
};