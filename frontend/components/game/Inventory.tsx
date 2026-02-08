export default function Inventory() {
  const items = [
    { id: 1, name: "Guitar", icon: "🎸" },
    { id: 2, name: "Skateboard", icon: "🛹" },
    { id: 3, name: "Camera", icon: "📷" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 p-2">
      {items.map((item) => (
        <div key={item.id} className="bg-gray-100 p-2 rounded-lg flex flex-col items-center justify-center aspect-square hover:bg-gray-200 cursor-pointer">
          <span className="text-2xl">{item.icon}</span>
          <span className="text-xs mt-1">{item.name}</span>
        </div>
      ))}
    </div>
  );
}
