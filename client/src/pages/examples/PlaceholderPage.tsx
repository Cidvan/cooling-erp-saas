import PlaceholderPage from '../PlaceholderPage';

export default function PlaceholderPageExample() {
  return (
    <PlaceholderPage 
      title="Service Reports"
      description="Track and manage your service reports and maintenance records"
      comingSoonFeatures={[
        "Create and edit service reports",
        "Track maintenance schedules", 
        "Generate PDF reports",
        "Client report sharing",
        "Technician assignment"
      ]}
    />
  );
}