import { useState, useEffect } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { supabase } from '../supabase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('week');
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    completedRequests: 0,
    avgResponseTime: 0,
    completionRate: 0,
    volunteerStats: [],
    requestsByType: {},
    requestsByStatus: {},
    requestsOverTime: {}
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      
      // Fetch requests data
      const { data: requestsData } = await supabase
        .from('requests')
        .select('*');

      // Calculate metrics
      const totalRequests = requestsData?.length || 0;
      const completedRequests = requestsData?.filter(r => r.status === 'completed').length || 0;
      const completionRate = totalRequests > 0 
        ? Math.round((completedRequests / totalRequests) * 100) 
        : 0;

      // Calculate average response time
      const responseTimes = requestsData
        .filter(r => r.completed_at && r.created_at)
        .map(r => {
          const created = new Date(r.created_at);
          const completed = new Date(r.completed_at);
          return (completed - created) / (1000 * 60 * 60); // in hours
        });
      
      const avgResponseTime = responseTimes.length > 0 
        ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1)
        : 0;

      // Group requests by type
      const requestsByType = requestsData?.reduce((acc, request) => {
        acc[request.aid_type] = (acc[request.aid_type] || 0) + 1;
        return acc;
      }, {});

      // Group requests by status
      const requestsByStatus = requestsData?.reduce((acc, request) => {
        acc[request.status] = (acc[request.status] || 0) + 1;
        return acc;
      }, {});

      // Get volunteer stats
      const { data: volunteers } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          requests:requests!assigned_to(
            id,
            status,
            created_at,
            completed_at
          )
        `)
        .eq('role', 'volunteer');

      const volunteerStats = volunteers?.map(volunteer => {
        const completed = volunteer.requests.filter(r => r.status === 'completed').length;
        const total = volunteer.requests.length;
        return {
          id: volunteer.id,
          name: volunteer.full_name || `Volunteer ${volunteer.id.slice(0, 6)}`,
          completed,
          total,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          avgResponseTime: 0 // Would need to calculate this from request timestamps
        };
      });

      setMetrics({
        totalRequests,
        completedRequests,
        avgResponseTime,
        completionRate,
        volunteerStats,
        requestsByType,
        requestsByStatus
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Chart data configurations
  const requestsByTypeData = {
    labels: Object.keys(metrics.requestsByType),
    datasets: [
      {
        label: 'Requests by Type',
        data: Object.values(metrics.requestsByType),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const statusDistributionData = {
    labels: Object.keys(metrics.requestsByStatus),
    datasets: [
      {
        label: 'Requests by Status',
        data: Object.values(metrics.requestsByStatus),
        backgroundColor: [
          'rgba(255, 159, 64, 0.7)',  // orange for pending
          'rgba(54, 162, 235, 0.7)',  // blue for in-progress
          'rgba(75, 192, 192, 0.7)',  // green for completed
        ],
        borderColor: [
          'rgba(255, 159, 64, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const volunteerPerformanceData = {
    labels: metrics.volunteerStats.map(v => v.name),
    datasets: [
      {
        label: 'Completed Requests',
        data: metrics.volunteerStats.map(v => v.completed),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h2>
        <div className="flex space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="day">Last 24 hours</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total Requests</h3>
          <p className="text-2xl font-bold">{metrics.totalRequests}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Completed</h3>
          <p className="text-2xl font-bold">{metrics.completedRequests}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Avg. Response Time</h3>
          <p className="text-2xl font-bold">{metrics.avgResponseTime} hours</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Completion Rate</h3>
          <p className="text-2xl font-bold">{metrics.completionRate}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Requests by Type</h3>
          <div className="h-64">
            <Pie 
              data={requestsByTypeData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = Math.round((value / total) * 100);
                        return `${label}: ${value} (${percentage}%)`;
                      },
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Status Distribution</h3>
          <div className="h-64">
            <Pie 
              data={statusDistributionData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow lg:col-span-2">
          <h3 className="text-lg font-medium mb-4">Volunteer Performance</h3>
          <div className="h-64">
            <Bar 
              data={volunteerPerformanceData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      afterLabel: (context) => {
                        const volunteer = metrics.volunteerStats[context.dataIndex];
                        return `Completion Rate: ${volunteer.completionRate}%`;
                      },
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Volunteer Details Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Volunteer Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volunteer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Assigned</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Response Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.volunteerStats.map((volunteer) => (
                <tr key={volunteer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {volunteer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {volunteer.completed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {volunteer.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                        <div 
                          className="bg-green-600 h-2.5 rounded-full" 
                          style={{ width: `${volunteer.completionRate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{volunteer.completionRate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {volunteer.avgResponseTime || 'N/A'} hours
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
