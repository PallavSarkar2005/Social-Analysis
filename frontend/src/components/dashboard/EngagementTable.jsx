export default function EngagementTable({
  videos,
}) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h2 className="font-bold text-xl mb-4">
        Engagement Ranking
      </h2>

      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left">Title</th>
            <th>Engagement</th>
          </tr>
        </thead>

        <tbody>
          {videos.map((video) => (
            <tr key={video._id}>
              <td>{video.title}</td>

              <td>
                {video.engagement.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}