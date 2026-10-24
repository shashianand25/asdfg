export default function MetricsCards({ summary }) {
  if (!summary) return null

  const { mae, rmse, bias, count } = summary

  const isOverForecast = bias > 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {/* MAE Card */}
      <div className="bg-white rounded-xl shadow border-l-4 border-blue-500 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
          Mean Absolute Error
        </p>
        <p className="text-3xl font-bold text-gray-800">
          {Math.round(mae).toLocaleString()}
          <span className="text-base font-normal text-gray-500 ml-1">MW</span>
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Average magnitude of forecast error
        </p>
      </div>

      {/* RMSE Card */}
      <div className="bg-white rounded-xl shadow border-l-4 border-purple-500 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
          Root Mean Square Error
        </p>
        <p className="text-3xl font-bold text-gray-800">
          {Math.round(rmse).toLocaleString()}
          <span className="text-base font-normal text-gray-500 ml-1">MW</span>
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Penalises large errors more heavily
        </p>
      </div>

      {/* Bias Card */}
      <div className={`bg-white rounded-xl shadow border-l-4 p-5 ${isOverForecast ? 'border-red-500' : 'border-green-500'}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
          Forecast Bias
        </p>
        <p className={`text-3xl font-bold ${isOverForecast ? 'text-red-600' : 'text-green-600'}`}>
          {bias > 0 ? '+' : ''}{Math.round(bias).toLocaleString()}
          <span className="text-base font-normal text-gray-500 ml-1">MW</span>
        </p>
        <p className={`text-xs mt-2 font-medium ${isOverForecast ? 'text-red-400' : 'text-green-500'}`}>
          {isOverForecast ? '(over-forecast)' : '(under-forecast)'}
        </p>
        {count && (
          <p className="text-xs text-gray-400 mt-1">
            Based on {count.toLocaleString()} periods
          </p>
        )}
      </div>
    </div>
  )
}
