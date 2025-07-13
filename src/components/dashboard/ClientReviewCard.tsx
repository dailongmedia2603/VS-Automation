import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";

const reviews = [
  {
    name: "Cody Fisher",
    handle: "@codyneedmoney",
    avatar: "https://i.pravatar.cc/150?u=cody",
    review: "negative",
  },
  {
    name: "Robert Fox",
    handle: "@robroke",
    avatar: "https://i.pravatar.cc/150?u=robert",
    review: "positive",
  },
  {
    name: "Kristin Watson",
    handle: "@kristinwantsomecash",
    avatar: "https://i.pravatar.cc/150?u=kristin",
    review: "negative",
  },
];

export const ClientReviewCard = () => {
  return (
    <Card className="shadow-sm rounded-2xl bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Client Review</CardTitle>
        <Button variant="link" className="text-blue-600">View All</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={review.avatar} />
                  <AvatarFallback>{review.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{review.name}</p>
                  <p className="text-sm text-muted-foreground">{review.handle}</p>
                </div>
              </div>
              {review.review === "positive" ? (
                <ThumbsUp className="h-5 w-5 text-green-500" />
              ) : (
                <ThumbsDown className="h-5 w-5 text-red-500" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};