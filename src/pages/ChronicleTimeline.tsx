import React from 'react';
import ChronicleEventCard from '../components/Chronicle/ChronicleEventCard';
import { WarLogEntry } from '../types'; // Adjust relative path if needed

export default function ChronicleTimeline() {
  const events: WarLogEntry[] = [
    // ... keep your array here
  ];

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <ChronicleEventCard key={event.id} event={event} />
      ))}
    </div>
  );
}