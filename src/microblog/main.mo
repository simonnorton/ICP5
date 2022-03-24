import List "mo:base/List";
import Iter "mo:base/Iter";
import Principal "mo:base/Principal";
import Time "mo:base/Time"

actor {
    public type Message = {
        author: Text;
        text: Text;
        time: Time.Time;
    };

    public type Microblog = actor {
        follow: shared(Principal) -> async (); 
        follows: shared query () -> async [Principal]; 
        post: shared (Text, Text) -> async (); 
        posts: shared query (Time.Time) -> async [Message]; 
        timeline: shared (Time.Time) -> async [Message]; 
        set_name: shared(Text) -> async(); 
        get_name: shared query () -> async ?Text; 
    };

    var name: Text = "";

    public shared func set_name(new_name: Text) : async () {
        name := new_name;
    };

    public shared query func get_name() : async ?Text {
        ?name;
    };

    var followed: List.List<Principal> = List.nil();

    public shared func follow(id: Principal) : async () {
        followed := List.push(id, followed);
    }; 

    public shared query func follows() : async [Principal] {
        List.toArray(followed);
    };

    var messages : List.List<Message> = List.nil();

    public shared func post(pwd: Text, text: Text) : async () {
        assert(pwd == "123456");
        let time = Time.now();
        let author = name;
        messages := List.push({author; text; time}, messages);
    };

    public shared query func posts(since: Time.Time) : async [Message] {
        //List.toArray(messages);
        List.toArray(List.filter<Message>(messages, func({time}) = time >= since));
    };

    public shared func timeline(since: Time.Time) : async [Message] {
        var all : List.List<Message> = List.nil();

        for(id in Iter.fromList(followed)) {
            let canister : Microblog = actor(Principal.toText(id));
            let msgs: [Message] = await canister.posts(since);
            all := List.append<Message>(List.fromArray(msgs), all);
        };

        List.toArray(all);
    };
};