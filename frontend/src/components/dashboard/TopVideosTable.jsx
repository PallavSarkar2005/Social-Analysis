export default function TopVideosTable({
  videos,
}) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h2 className="font-bold text-xl mb-4">
        Top Videos
      </h2>

      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left">Title</th>
            <th>Views</th>
          </tr>
        </thead>

        <tbody>
          {videos.map((video) => (
            <tr key={video._id}>
              <td>{video.title}</td>

              <td>
                {video.views.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}